/**
 * Button 컴포넌트 테스트
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button 컴포넌트", () => {
  it("기본 버튼 렌더링", () => {
    render(<Button>클릭</Button>);
    expect(screen.getByRole("button", { name: "클릭" })).toBeInTheDocument();
  });

  it("primary variant 스타일 적용", () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-indigo-600");
  });

  it("secondary variant 스타일 적용", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-emerald-600");
  });

  it("ghost variant 스타일 적용", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-transparent");
  });

  it("danger variant 스타일 적용", () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-red-600");
  });

  it("sm 사이즈 스타일 적용", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("px-3", "py-1.5", "text-sm");
  });

  it("lg 사이즈 스타일 적용", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("px-6", "py-3", "text-lg");
  });

  it("fullWidth 속성 적용", () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("w-full");
  });

  it("disabled 상태에서 클릭 불가", () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("로딩 상태 표시", () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toBeInTheDocument(); // Spinner SVG
  });

  it("onClick 이벤트 핸들러 호출", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("leftIcon 렌더링", () => {
    const Icon = () => <span data-testid="left-icon">icon</span>;
    render(<Button leftIcon={<Icon />}>With Icon</Button>);
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("rightIcon 렌더링", () => {
    const Icon = () => <span data-testid="right-icon">icon</span>;
    render(<Button rightIcon={<Icon />}>With Icon</Button>);
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  it("type 속성 전달", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("className 병합", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
