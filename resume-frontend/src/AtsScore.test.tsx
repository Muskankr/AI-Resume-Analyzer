import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AtsScore } from "./AtsScore";
import React from "react";
import "@testing-library/jest-dom";

describe("AtsScore Component Unit Tests", () => {
  
  it("renders correctly with a low score value of 20", () => {
    render(<AtsScore score={20} />);
    
    const scoreText = screen.getByTestId("ats-score-text");
    expect(scoreText).toBeInTheDocument();
    expect(scoreText).toHaveTextContent("20%");
    
    const scoreCircle = screen.getByTestId("ats-score-circle");
    expect(scoreCircle).toHaveStyle({ "--score": "72deg" });
  });

  it("renders correctly with a medium score value of 60", () => {
    render(<AtsScore score={60} />);
    
    const scoreText = screen.getByTestId("ats-score-text");
    expect(scoreText).toBeInTheDocument();
    expect(scoreText).toHaveTextContent("60%");
    
    const scoreCircle = screen.getByTestId("ats-score-circle");
    expect(scoreCircle).toHaveStyle({ "--score": "216deg" });
  });

  it("renders correctly with a high score value of 95", () => {
    render(<AtsScore score={95} />);
    
    const scoreText = screen.getByTestId("ats-score-text");
    expect(scoreText).toBeInTheDocument();
    expect(scoreText).toHaveTextContent("95%");
    
    const scoreCircle = screen.getByTestId("ats-score-circle");
    expect(scoreCircle).toHaveStyle({ "--score": "342deg" });
  });
});
