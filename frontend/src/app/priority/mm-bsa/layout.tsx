import "./mm-bsa.css";

export default function MMBsaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mm-wrapper">
      <div className="mm-container">
        {children}
      </div>
    </div>
  );
}