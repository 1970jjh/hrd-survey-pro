/**
 * Modal 컴포넌트 테스트
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";

describe("Modal 컴포넌트", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: "테스트 모달",
    children: <p>모달 내용</p>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("isOpen=true일 때 모달 렌더링", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText("테스트 모달")).toBeInTheDocument();
    expect(screen.getByText("모달 내용")).toBeInTheDocument();
  });

  it("isOpen=false일 때 모달 숨김", () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("테스트 모달")).not.toBeInTheDocument();
  });

  it("제목 렌더링", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText("테스트 모달")).toBeInTheDocument();
  });

  it("닫기 버튼 클릭 시 onClose 호출", () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    // aria-label이 "Close modal"인 버튼 찾기
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop 클릭 시 onClose 호출", () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    // backdrop 클릭 (모달 외부)
    const backdrop = screen.getByTestId("modal-backdrop");
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ESC 키 누르면 onClose 호출", () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sm 사이즈 적용", () => {
    render(<Modal {...defaultProps} size="sm" />);
    const modal = screen.getByRole("dialog");
    expect(modal).toHaveClass("max-w-sm");
  });

  it("md 사이즈 적용 (기본값)", () => {
    render(<Modal {...defaultProps} />);
    const modal = screen.getByRole("dialog");
    expect(modal).toHaveClass("max-w-md");
  });

  it("lg 사이즈 적용", () => {
    render(<Modal {...defaultProps} size="lg" />);
    const modal = screen.getByRole("dialog");
    expect(modal).toHaveClass("max-w-lg");
  });

  it("xl 사이즈 적용", () => {
    render(<Modal {...defaultProps} size="xl" />);
    const modal = screen.getByRole("dialog");
    expect(modal).toHaveClass("max-w-xl");
  });

  it("children 렌더링", () => {
    render(
      <Modal {...defaultProps}>
        <div data-testid="custom-content">커스텀 컨텐츠</div>
      </Modal>
    );
    expect(screen.getByTestId("custom-content")).toBeInTheDocument();
  });
});
