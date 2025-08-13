# Stage 1: 빌드 스테이지 (Go 애플리케이션 빌드)
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY backend/go.mod .
COPY backend/go.sum .
RUN go mod download
COPY backend/ .
# [수정 시작] 서비스 계정 키 파일 COPY 라인 제거 (또는 주석 처리)
# COPY backend/serviceAccountKey.json .
# [수정 끝]
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix nocgo -o main .

# Stage 2: 실행 스테이지 (빌드된 애플리케이션 실행)
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
