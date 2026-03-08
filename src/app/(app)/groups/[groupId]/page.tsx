/**
 * Next.js route entry for a group that redirects to its default subpage.
 */
import { redirect } from "next/navigation";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  redirect(`/groups/${groupId}/calendar`);
}
