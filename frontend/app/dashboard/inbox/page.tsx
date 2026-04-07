"use client";

import { Suspense } from "react";
import InboxClient from "../../components/inbox/InboxClient";

function InboxContent() {
  return <InboxClient />;
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[var(--text-muted)]">Loading inbox...</div>}>
      <InboxContent />
    </Suspense>
  );
}
