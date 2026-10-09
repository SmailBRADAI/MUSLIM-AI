import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewBadge } from "../../src/components/ReviewBadge";
import { RulingTag } from "../../src/components/RulingTag";
import { displayStatus } from "../../src/data/types";
import { SaiDiagram, TawafDiagram } from "../../src/components/Diagrams";
import { I18nProvider, strings } from "../../src/i18n";

const inEnglish = (ui: React.ReactNode) => render(<I18nProvider language="en">{ui}</I18nProvider>);

describe("ReviewBadge", () => {
  it("shows reviewed only for approved content", () => {
    inEnglish(<ReviewBadge status="approved" />);
    expect(screen.getByText("Reviewed content")).toBeInTheDocument();
  });

  it.each(["draft", "in-review"] as const)("shows pending review for %s content", (status) => {
    inEnglish(<ReviewBadge status={status} />);
    expect(screen.getByText("Pending scholarly review")).toBeInTheDocument();
    expect(screen.queryByText("Reviewed content")).not.toBeInTheDocument();
  });
});

describe("displayStatus", () => {
  const step = (status: "draft" | "in-review" | "approved") => ({ meta: { source: ["s"], status, version: "1" } });
  const text = (status: "draft" | "in-review" | "approved") => ({ review: { status } });

  it("is approved only when both the step and the language text are approved", () => {
    expect(displayStatus(step("approved"), text("approved"))).toBe("approved");
    expect(displayStatus(step("approved"), text("in-review"))).toBe("in-review");
    expect(displayStatus(step("in-review"), text("approved"))).toBe("in-review");
    expect(displayStatus(step("approved"), text("draft"))).toBe("draft");
  });
});

describe("RulingTag", () => {
  it("shows one label when there is no difference", () => {
    inEnglish(<RulingTag ruling="rukn" />);
    expect(screen.getByText("Pillar")).toBeInTheDocument();
  });

  it("shows one label when both sheikhs agree", () => {
    inEnglish(
      <RulingTag
        ruling="wajib"
        views={[
          { scholar: "ibn-baz", ruling: "wajib", source: "a" },
          { scholar: "ibn-uthaymeen", ruling: "wajib", source: "b" },
        ]}
      />,
    );
    expect(screen.getByText("Obligatory")).toBeInTheDocument();
    expect(screen.queryByText(/Ibn Baz/)).not.toBeInTheDocument();
  });

  it("shows both views when Ibn Baz and Ibn Al-Uthaymeen differ", () => {
    inEnglish(
      <RulingTag
        ruling="wajib"
        views={[
          { scholar: "ibn-baz", ruling: "wajib", source: "a" },
          { scholar: "ibn-uthaymeen", ruling: "sunnah", source: "b" },
        ]}
      />,
    );
    expect(screen.getByText("Ibn Baz: Obligatory")).toBeInTheDocument();
    expect(screen.getByText("Ibn Al-Uthaymeen: Sunnah")).toBeInTheDocument();
  });
});

describe("Diagrams (T021)", () => {
  it.each(["ar", "en", "ur"] as const)("keeps Tawaf counter-clockwise and Safa on the left in %s", (language) => {
    render(
      <I18nProvider language={language}>
        <div dir={language === "en" ? "ltr" : "rtl"}>
          <TawafDiagram />
          <SaiDiagram />
        </div>
      </I18nProvider>,
    );
    const [tawaf, sai] = screen.getAllByRole("img");
    expect(tawaf).toHaveAttribute("dir", "ltr");
    expect(tawaf.querySelector(".direction-arrow")?.textContent).toBe("↺");
    expect(sai).toHaveAttribute("dir", "ltr");
    const labels = sai.querySelectorAll(".sai-labels span");
    expect(labels[0].textContent).toBe(strings[language].diagrams.safa);
    expect(labels[1].textContent).toBe(strings[language].diagrams.marwah);
  });
});
