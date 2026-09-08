import type { Metadata } from "next";
import ApiDocsClient from "./ApiDocsClient";

export const metadata: Metadata = {
  title: "API Documentation — Agent Hub",
  description: "Interactive API documentation for the Agent Hub platform",
};

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}

