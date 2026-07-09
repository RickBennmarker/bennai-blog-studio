"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Stuurt de gebruiker naar /setup zolang de wizard niet is doorlopen, en weg
 * van /setup zodra dat wel zo is. De waarheid staat in de instellingen op de
 * server; dit is de client-side redirect op basis daarvan.
 */
export default function SetupGate({ complete }: { complete: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!complete && pathname !== "/setup") {
      router.replace("/setup");
    } else if (complete && pathname === "/setup") {
      router.replace("/");
    }
  }, [complete, pathname, router]);

  return null;
}
