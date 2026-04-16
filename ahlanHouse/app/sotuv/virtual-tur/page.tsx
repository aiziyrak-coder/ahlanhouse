import { redirect } from "next/navigation";

/**
 * Virtual tur Obyektlar sahifasida birlashtirilgan.
 * Eski havolalar /sotuv/obyektlar ga yo'naltiriladi.
 */
export default function SotuvVirtualTurRedirect() {
  redirect("/sotuv/obyektlar");
}
