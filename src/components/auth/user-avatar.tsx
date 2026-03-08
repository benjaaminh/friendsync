/**
 * Feature component responsible for user avatar rendering and interactions.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  image?: string | null;
  className?: string;
}
// no functionality to use a custom avatar, yet
export function UserAvatar({ name, image, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage src={image || undefined} alt={name || "User"} />
      <AvatarFallback className="text-xs">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
