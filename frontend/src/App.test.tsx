import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Footer } from "./Footer";
import { AtsScore } from "./AtsScore";
import { StepProgress } from "./components/StepProgress";
import { SkillChip } from "./components/SkillChip";
import EmptyState from "./components/EmptyState";

describe("Frontend Component Tests", () => {
    it("renders Footer", () => {
        render(<Footer />);
        expect(
            screen.getByRole("heading", { name: /AI Resume Analyzer/i })
        ).toBeInTheDocument();
    });

    it("renders AtsScore", () => {
        render(<AtsScore score={85} />);
        expect(screen.getByText(/ATS Resume Score/i)).toBeInTheDocument();
        expect(screen.getByText(/85/i)).toBeInTheDocument();
    });

    it("renders StepProgress", () => {
        render(
            <StepProgress
                currentStep={2}
                isAnalyzing={false}
                isComplete={false}
            />
        );

        expect(screen.getByText(/Upload/i)).toBeInTheDocument();
        expect(screen.getByText(/Analyzing/i)).toBeInTheDocument();
        expect(screen.getByText(/Results/i)).toBeInTheDocument();
    });

    it("renders SkillChip", () => {
        render(<SkillChip skill="Python" type="matched" />);
        expect(screen.getByText("Python")).toBeInTheDocument();
    });

    it("renders EmptyState", () => {
        render(<EmptyState onReset={() => {}} />);

        expect(
            screen.getByRole("heading", {
                name: /no resume uploaded yet/i,
            })
        ).toBeInTheDocument();

        expect(
            screen.getByText(
                /upload a resume to see your ats score, skills analysis, and personalized suggestions\./i
            )
        ).toBeInTheDocument();
    });
});