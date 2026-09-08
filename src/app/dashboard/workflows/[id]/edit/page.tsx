import { redirect } from "next/navigation";

export default async function WorkflowEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/skills/${id}/edit`);
}
