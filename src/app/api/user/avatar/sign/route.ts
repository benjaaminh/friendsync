import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

/**
 * Sign profile picture to cloudinary storage
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `friendsync/users/${session.user.id}`;

  const paramsToSign = {
    timestamp,
    folder,
    transformation: "c_limit,w_1200,h_1200,q_auto,f_auto",
    eager: "c_fill,w_256,h_256,q_auto,f_auto",
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