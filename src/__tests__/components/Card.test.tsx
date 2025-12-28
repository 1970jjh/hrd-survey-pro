/**
 * Card 컴포넌트 테스트
 */

import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";

describe("Card 컴포넌트", () => {
  it("기본 Card 렌더링", () => {
    render(<Card>카드 내용</Card>);
    expect(screen.getByText("카드 내용")).toBeInTheDocument();
  });

  it("glass-card 클래스 적용", () => {
    render(<Card data-testid="card">내용</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("glass-card");
  });

  it("hover 효과 적용", () => {
    render(
      <Card hover data-testid="card">
        Hover Card
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("glass-card-hover");
  });

  it("padding 옵션 적용", () => {
    render(
      <Card padding="lg" data-testid="card">
        Large Padding
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("p-8");
  });

  it("className 병합", () => {
    render(
      <Card className="custom-class" data-testid="card">
        Custom
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("custom-class", "glass-card");
  });
});

describe("CardHeader 컴포넌트", () => {
  it("CardHeader 렌더링", () => {
    render(<CardHeader>헤더 제목</CardHeader>);
    expect(screen.getByText("헤더 제목")).toBeInTheDocument();
  });

  it("border-bottom 스타일 적용", () => {
    render(<CardHeader data-testid="header">헤더</CardHeader>);
    const header = screen.getByTestId("header");
    expect(header).toHaveClass("border-b");
  });
});

describe("CardContent 컴포넌트", () => {
  it("CardContent 렌더링", () => {
    render(<CardContent>컨텐츠 영역</CardContent>);
    expect(screen.getByText("컨텐츠 영역")).toBeInTheDocument();
  });

  it("padding 적용", () => {
    render(<CardContent data-testid="content">내용</CardContent>);
    const content = screen.getByTestId("content");
    expect(content).toHaveClass("p-6");
  });
});

describe("CardFooter 컴포넌트", () => {
  it("CardFooter 렌더링", () => {
    render(<CardFooter>푸터 영역</CardFooter>);
    expect(screen.getByText("푸터 영역")).toBeInTheDocument();
  });

  it("border-top 스타일 적용", () => {
    render(<CardFooter data-testid="footer">푸터</CardFooter>);
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveClass("border-t");
  });
});

describe("Card 조합 테스트", () => {
  it("Card + CardHeader + CardContent + CardFooter 조합", () => {
    render(
      <Card>
        <CardHeader>제목</CardHeader>
        <CardContent>본문</CardContent>
        <CardFooter>하단</CardFooter>
      </Card>
    );

    expect(screen.getByText("제목")).toBeInTheDocument();
    expect(screen.getByText("본문")).toBeInTheDocument();
    expect(screen.getByText("하단")).toBeInTheDocument();
  });
});
