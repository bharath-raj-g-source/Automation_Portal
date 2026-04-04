import time
import json
import logging
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from typing import Dict, Any, List
from datetime import datetime

# Configure standard logging to output to stdout (captured by ECS logs)
logger = logging.getLogger("qc_audit")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class QCAuditTracker:
    """
    Tracks QC metrics during a single processing run and logs them 
    for CloudWatch aggregation and custom metrics.
    """
    def __init__(self, filename: str):
        self.filename = filename
        self.start_time = time.time()
        self.aws_enabled = False
        
        # Initialize CloudWatch client safely
        try:
            # Matches your CLI region ap-south-1
            self.cw_client = boto3.client('cloudwatch', region_name='ap-south-1')
            self.aws_enabled = True
        except Exception as e:
            logger.warning(f"CloudWatch metrics disabled (Local Mode): {e}")

        self.stats = {
            "filename": filename,
            "timestamp": datetime.utcnow().isoformat(),
            "total_rows_processed": 0,
            "checks_executed": {}
        }

    def log_check_result(self, result: Dict[str, Any]):
        """
        Stores metrics from individual QC steps.
        """
        check_key = result.get("check_key", "unknown_check")
        details = result.get("details", {})
        
        rows_flagged = details.get("rows_flagged", 0)
        rows_processed = details.get("rows_processed", self.stats["total_rows_processed"])

        self.stats["checks_executed"][check_key] = {
            "status": result.get("status"),
            "rows_flagged": rows_flagged,
            "rows_processed": rows_processed
        }
        
        # Update global total if this check provides it
        if rows_processed > self.stats["total_rows_processed"]:
            self.stats["total_rows_processed"] = rows_processed

    def _push_cloudwatch_metrics(self):
        """
        Pushes aggregate metrics to CloudWatch Custom Metrics safely.
        """
        if not self.aws_enabled:
            return

        try:
            # Common dimension for all metrics in this run
            dimensions = [{'Name': 'FileName', 'Value': self.filename}]
            
            metric_data = [
                {
                    'MetricName': 'TotalRowsProcessed',
                    'Dimensions': dimensions,
                    'Value': self.stats["total_rows_processed"],
                    'Unit': 'Count'
                },
                {
                    'MetricName': 'ProcessingDuration',
                    'Dimensions': dimensions,
                    'Value': self.stats["duration_seconds"],
                    'Unit': 'Seconds'
                }
            ]
            
            # Add individual check flags as metrics
            for check, data in self.stats["checks_executed"].items():
                metric_data.append({
                    'MetricName': f'RowsFlagged_{check}',
                    'Dimensions': dimensions,
                    'Value': data['rows_flagged'],
                    'Unit': 'Count'
                })

            # Note: put_metric_data handles up to 20 metrics per call
            self.cw_client.put_metric_data(
                Namespace='QC_Engine_Metrics',
                MetricData=metric_data
            )
        except (NoCredentialsError, ClientError) as e:
            logger.error(f"AWS Credential/Permission Error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error pushing metrics: {e}")

    def finalize(self):
        """
        Finalizes stats and triggers pushes to AWS.
        """
        self.stats["duration_seconds"] = round(time.time() - self.start_time, 2)
        
        # 1. Log JSON for CloudWatch Logs Insights (Primary logging)
        log_payload = {
            "log_type": "QC_METRIC_SUMMARY",
            "data": self.stats
        }
        logger.info(json.dumps(log_payload))
        
        # 2. Push to CloudWatch Metrics for dashboards (Numeric tracking)
        self._push_cloudwatch_metrics()
        
        return self.stats