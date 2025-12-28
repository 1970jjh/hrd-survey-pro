/**
 * Badge 컴포넌트 테스트
 */

import { render, screen } from "@testing-library/react";
import { Badge, StatusBadge } from "@/components/ui/Badge";

describe("Badge 컴포넌트", () => {
  it("기본 Badge 렌더링", () => {
    render(<Badge>라벨</Badge>);
    expect(screen.getByText("라벨")).toBeInTheDocument();
  });

  it("default variant 스타일", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-gray-100", "text-gray-800");
  });

  it("primary variant 스타일", () => {
    render(
      <Badge variant="primary" data-testid="badge">
        Primary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-indigo-100", "text-indigo-800");
  });

  it("success variant 스타일", () => {
    render(
      <Badge variant="success" data-testid="badge">
        Success
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-emerald-100", "text-emerald-800");
  });

  it("warning variant 스타일", () => {
    render(
      <Badge variant="warning" data-testid="badge">
        Warning
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-amber-100", "text-amber-800");
  });

  it("danger variant 스타일", () => {
    render(
      <Badge variant="danger" data-testid="badge">
        Danger
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-red-100", "text-red-800");
  });

  it("sm 사이즈 적용", () => {
    render(
      <Badge size="sm" data-testid="badge">
        Small
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("text-xs", "px-2", "py-0.5");
  });

  it("lg 사이즈 적용", () => {
    render(
      <Badge size="lg" data-testid="badge">
        Large
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("text-base", "px-4", "py-1.5");
  });

  it("className 병합", () => {
    render(
      <Badge className="custom-class" data-testid="badge">
        Custom
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("custom-class");
  });
});

describe("StatusBadge 컴포넌트", () => {
  it("draft 상태 렌더링", () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText("초안")).toBeInTheDocument();
  });

  it("active 상태 렌더링", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("진행중")).toBeInTheDocument();
  });

  it("closed 상태 렌더링", () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText("종료")).toBeInTheDocument();
  });

  it("draft 상태에 default variant 적용", () => {
    render(<StatusBadge status="draft" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-gray-100");
  });

  it("active 상태에 success variant 적용", () => {
    render(<StatusBadge status="active" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-emerald-100");
  });

  it("closed 상태에 warning variant 적용", () => {
    render(<StatusBadge status="closed" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-amber-100");
  });
});
