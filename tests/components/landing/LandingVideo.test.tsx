import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import LandingVideo from "@/components/landing/LandingVideo";

describe("LandingVideo", () => {
  it("shows the poster and a play button, no video yet", () => {
    const { container } = render(<LandingVideo mutedColor="#999" />);
    expect(screen.getByAltText(/Panel de Movements/)).toHaveAttribute("src", "/demo-poster.jpg");
    expect(screen.getByRole("button", { name: "Reproducir demostración" })).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
  });

  it("swaps the poster for the video with controls after pressing play", async () => {
    const { container } = render(<LandingVideo mutedColor="#999" />);
    await userEvent.click(screen.getByRole("button", { name: "Reproducir demostración" }));
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("controls");
  });

  it("falls back to the poster with a message when the video fails", async () => {
    const { container } = render(<LandingVideo mutedColor="#999" />);
    await userEvent.click(screen.getByRole("button", { name: "Reproducir demostración" }));
    fireEvent.error(container.querySelector("video")!);
    expect(screen.getByAltText(/Panel de Movements/)).toBeInTheDocument();
    expect(screen.getByText(/No pudimos cargar el video/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reproducir demostración" })).toBeNull();
  });
});
