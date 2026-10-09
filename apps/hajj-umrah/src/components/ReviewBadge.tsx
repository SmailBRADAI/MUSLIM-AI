import type { ReviewStatus } from "../data/types";
import { useT } from "../i18n";
import { Icon } from "./Icon";

/** Constitution Principle I: only approved content may look reviewed. */
export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const t = useT();
  if (status === "approved") {
    return <span className="tag reviewed"><Icon name="shield" size={14} />{t.review.approved}</span>;
  }
  return <span className="tag pending">{t.review.pending}</span>;
}
