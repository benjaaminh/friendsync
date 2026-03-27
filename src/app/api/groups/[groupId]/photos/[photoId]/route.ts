/**
 * API route for deleting an individual event photo.
 * DELETE /api/groups/:groupId/photos/:photoId
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string; photoId: string }> }
) {
  const { groupId, photoId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const photo = await prisma.eventPhoto.findUnique({
    where: { id: photoId },
    include: { todo: { select: { groupId: true } } },
  });

  if (!photo || photo.todo.groupId !== groupId) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Only the uploader or a group admin can delete
  if (photo.uploadedById !== access.userId && access.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(photo.cloudinaryId);
  } catch {
    // Log but don't block deletion if Cloudinary fails
  }

  await prisma.eventPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ success: true });
}
