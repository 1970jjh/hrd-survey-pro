/**
 * Input 컴포넌트 테스트
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/Input";

describe("Input 컴포넌트", () => {
  it("기본 입력 필드 렌더링", () => {
    render(<Input placeholder="입력하세요" />);
    expect(screen.getByPlaceholderText("입력하세요")).toBeInTheDocument();
  });

  it("라벨 렌더링", () => {
    render(<Input label="이메일" id="email" />);
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
  });

  it("에러 메시지 표시", () => {
    render(<Input error="필수 입력 항목입니다" />);
    expect(screen.getByText("필수 입력 항목입니다")).toBeInTheDocument();
  });

  it("에러 상태에서 스타일 변경", () => {
    render(<Input error="에러" data-testid="input" />);
    const input = screen.getByTestId("input");
    expect(input).toHaveClass("border-red-500");
  });

  it("도움말 텍스트 표시", () => {
    render(<Input helperText="8자 이상 입력하세요" />);
    expect(screen.getByText("8자 이상 입력하세요")).toBeInTheDocument();
  });

  it("왼쪽 아이콘 렌더링", () => {
    const Icon = () => <span data-testid="left-icon">@</span>;
    render(<Input leftIcon={<Icon />} />);
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("오른쪽 아이콘 렌더링", () => {
    const Icon = () => <span data-testid="right-icon">✓</span>;
    render(<Input rightIcon={<Icon />} />);
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  it("disabled 상태", () => {
    render(<Input disabled data-testid="input" />);
    expect(screen.getByTestId("input")).toBeDisabled();
  });

  it("값 입력 및 onChange 호출", () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input" />);

    const input = screen.getByTestId("input");
    fireEvent.change(input, { target: { value: "테스트" } });

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue("테스트");
  });

  it("type 속성 전달", () => {
    render(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId("input")).toHaveAttribute("type", "password");
  });

  it("required 속성 전달", () => {
    render(<Input required data-testid="input" />);
    expect(screen.getByTestId("input")).toBeRequired();
  });

  it("className 병합", () => {
    render(<Input className="custom-input" data-testid="input" />);
    expect(screen.getByTestId("input")).toHaveClass("custom-input");
  });
});
