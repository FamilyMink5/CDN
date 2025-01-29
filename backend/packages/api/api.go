package api

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

type FileInfo struct {
	Name       string `json:"name"`
	Size       int64  `json:"size"`
	UploadDate string `json:"uploadDate"`
}

var (
	API_KEY string
	AES_KEY []byte
)

const (
	CHUNK_SIZE = 1024 * 1024 // 1MB 단위로 처리
)

func init() {
	// .env 파일 로드
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: .env file not found")
	}

	// 환경 변수 로드
	API_KEY = os.Getenv("API_KEY")
	if API_KEY == "" {
		panic("API_KEY is not set in environment variables")
	}

	// AES 키 로드
	aesKeyStr := os.Getenv("AES_KEY")
	if aesKeyStr == "" {
		panic("AES_KEY is not set in environment variables")
	}

	// Base64 디코딩
	var err error
	AES_KEY, err = base64.StdEncoding.DecodeString(aesKeyStr)
	if err != nil {
		panic(fmt.Sprintf("Failed to decode AES_KEY: %v", err))
	}

	// AES 키 길이 검증 (32바이트)
	if len(AES_KEY) != 32 {
		panic(fmt.Sprintf("Invalid AES key length: expected 32 bytes, got %d bytes", len(AES_KEY)))
	}
}

// API 키 검증 미들웨어
func validateAPIKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-API-Key")
		if key != API_KEY {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "유효하지 않은 API 키입니다"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// AES 암호화 함수
func encryptFile(data []byte) ([]byte, error) {
	// 단일 nonce 생성
	nonce := make([]byte, 12)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("nonce 생성 실패: %v", err)
	}

	// AES-GCM 초기화 (모든 청크에 재사용)
	block, err := aes.NewCipher(AES_KEY)
	if err != nil {
		return nil, fmt.Errorf("AES 블록 생성 실패: %v", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("GCM 모드 초기화 실패: %v", err)
	}

	// 청크 단위로 나누어 처리
	chunks := make([][]byte, 0)
	totalLen := len(data)

	for i := 0; i < totalLen; i += CHUNK_SIZE {
		end := i + CHUNK_SIZE
		if end > totalLen {
			end = totalLen
		}

		chunk := data[i:end]
		// 동일한 nonce로 청크 암호화
		encryptedChunk := aesgcm.Seal(nil, nonce, chunk, nil)
		chunks = append(chunks, encryptedChunk)
	}

	// 결과 데이터 생성 (nonce + 모든 암호화된 청크)
	totalSize := len(nonce)
	for _, chunk := range chunks {
		totalSize += len(chunk)
	}

	result := make([]byte, 0, totalSize)
	// nonce를 결과의 시작에 추가
	result = append(result, nonce...)
	// 암호화된 청크들을 순차적으로 추가
	for _, chunk := range chunks {
		result = append(result, chunk...)
	}

	return result, nil
}

// MIME 타입 가져오기
func getMimeType(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".ogv":
		return "video/ogg"
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".oga":
		return "audio/ogg"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

func RunFileServer() {
	router := gin.Default()

	// CORS 설정
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8080", "http://cdn.familymink5.kr", "https://cdn.familymink5.kr"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API 키 검증 미들웨어 적용
	router.Use(validateAPIKey())

	// 파일 다운로드
	router.GET("/download/:filename", func(c *gin.Context) {
		filename := c.Param("filename")
		filePath := filepath.Join("D:\\CDN_DB", filename)

		// 파일 정보 확인
		fileInfo, err := os.Stat(filePath)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "파일을 찾을 수 없습니다"})
			return
		}

		// Content-Type 설정
		mimeType := getMimeType(filename)
		c.Header("Content-Type", mimeType)

		// 스트리밍이 필요한 파일 타입인지 확인
		isStreamable := strings.HasPrefix(mimeType, "video/") || strings.HasPrefix(mimeType, "audio/")

		if isStreamable {
			// 스트리밍 헤더 설정
			c.Header("Accept-Ranges", "bytes")
			c.Header("Cache-Control", "no-cache")
		} else {
			// 다운로드 파일인 경우
			c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		}

		// 파일이 너무 큰 경우 스트리밍 처리
		if fileInfo.Size() > CHUNK_SIZE*10 { // 10MB 이상
			file, err := os.Open(filePath)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "파일을 열 수 없습니다"})
				return
			}
			defer file.Close()

			// 단일 nonce 생성
			nonce := make([]byte, 12)
			if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "nonce 생성 실패"})
				return
			}

			// AES-GCM 초기화 (모든 청크에 재사용)
			block, err := aes.NewCipher(AES_KEY)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "AES 블록 생성 실패"})
				return
			}

			aesgcm, err := cipher.NewGCM(block)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "GCM 모드 초기화 실패"})
				return
			}

			buffer := make([]byte, CHUNK_SIZE)
			writer := base64.NewEncoder(base64.StdEncoding, c.Writer)
			defer writer.Close()

			// nonce를 먼저 전송
			if _, err := writer.Write(nonce); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "nonce 전송 실패"})
				return
			}

			for {
				n, err := file.Read(buffer)
				if err == io.EOF {
					break
				}
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "파일 읽기 실패"})
					return
				}

				chunk := buffer[:n]
				// 동일한 nonce로 청크 암호화
				encryptedChunk := aesgcm.Seal(nil, nonce, chunk, nil)

				if _, err := writer.Write(encryptedChunk); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "응답 전송 실패"})
					return
				}

				// 버퍼 플러시
				c.Writer.Flush()
			}
			return
		}

		// 작은 파일은 기존 방식대로 처리
		data, err := os.ReadFile(filePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "파일을 읽을 수 없습니다"})
			return
		}

		encryptedData, err := encryptFile(data)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "파일 암호화 실패"})
			return
		}

		encodedData := base64.StdEncoding.EncodeToString(encryptedData)
		c.String(http.StatusOK, encodedData)
	})

	// 파일 목록
	router.GET("/files", func(c *gin.Context) {
		files := []FileInfo{}
		dir := "D:\\CDN_DB"

		entries, err := os.ReadDir(dir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, entry := range entries {
			if !entry.IsDir() {
				info, err := entry.Info()
				if err != nil {
					continue
				}

				files = append(files, FileInfo{
					Name:       info.Name(),
					Size:       info.Size(),
					UploadDate: info.ModTime().Format("2006-01-02 15:04:05"),
				})
			}
		}

		c.JSON(http.StatusOK, files)
	})

	fmt.Println("서버가 http://localhost:17233 에서 실행 중입니다")
	router.Run(":17233")
}
