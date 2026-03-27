/**
 * API route that generates a signed Cloudinary upload signature.
 * POST /api/groups/:groupId/photos/sign
 */
import { NextRequest, NextResponse } from "next/server";
import { requireGroupAccess } from "@/lib/group-access";
import { cloudinary } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const access = await requireGroupAccess(groupId);
  if (!access.ok) return access.response;

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `friendsync/${groupId}`;

  const paramsToSign = {
    timestamp,
    folder,
    transformation: "c_limit,w_1600,h_1600,q_auto",
    eager: "c_fill,w_400,h_400,q_auto",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    transformation: paramsToSign.transformation,
    eager: paramsToSign.eager,
    maxFileSize: MAX_FILE_SIZE,
  });
}
