"use client";

import { useEffect, useState } from "react";
import { OWNER_TOKEN_LS_KEY } from "../_lib/ownerHeader";
import { STATIC_MODE } from "../_lib/static-mode";

// Owner gate. The site is shared read-only with friends; the owner sets
// `localStorage.ownerToken = "<matching OWNER_TOKEN env value>"` once per
// browser, which both unlocks mutating UI here and authorises mutating API
// calls via the `x-owner-token` header.
//
// Presence of any token is treated as "claims to be owner" for UI gating —
// the server still verifies the value, so a fake token gets you 403s but
// no UI advantage either.

export function useIsOwner(): boolean {
  // Static (Pages) mode has no server to verify a token against; every
  // mutation is a localStorage overlay, so the visitor is always "owner".
  // Constant at build time, so there is no hydration mismatch.
  //
  // Default false on first paint otherwise so non-owner visitors never
  // flash owner-only UI before hydration.
  const [isOwner, setIsOwner] = useState(STATIC_MODE);

  useEffect(() => {
    if (STATIC_MODE) return;
    try {
      setIsOwner(!!window.localStorage.getItem(OWNER_TOKEN_LS_KEY));
    } catch {
      // localStorage can throw in privacy modes; default to non-owner.
    }
  }, []);

  return isOwner;
}
