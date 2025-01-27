package api

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
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
	AES_KEY string
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
	AES_KEY = os.Getenv("AES_KEY")
	if AES_KEY == "" {
		panic("AES_KEY is not set in environment variables")
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
	block, err := aes.NewCipher([]byte(AES_KEY))
	if err != nil {
		return nil, err
	}

	// GCM 모드 사용
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Nonce 생성
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// 암호화 및 nonce 추가
	ciphertext := gcm.Seal(nonce, nonce, data, nil)
	return ciphertext, nil
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
		filepath := filepath.Join("D:\\CDN_DB", filename)

		if _, err := os.Stat(filepath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "파일을 찾을 수 없습니다"})
			return
		}

		// 파일 읽기
		data, err := ioutil.ReadFile(filepath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "파일 읽기 실패"})
			return
		}

		// 파일 암호화
		encryptedData, err := encryptFile(data)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "파일 암호화 실패"})
			return
		}

		// Base64 인코딩하여 전송
		encodedData := base64.StdEncoding.EncodeToString(encryptedData)

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "application/octet-stream")
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
