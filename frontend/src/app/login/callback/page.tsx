"use client";
import { LoginCallback } from "@okta/okta-react";

export default function OktaCallbackPage() {
  // This component handles the exchange of the auth code for tokens
  return <LoginCallback />;
}