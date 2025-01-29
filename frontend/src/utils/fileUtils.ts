// 암호화 관련 상수
const CHUNK_SIZE = 1024 * 1024; // 1MB (서버와 동일)
const NONCE_SIZE = 12;
const GCM_TAG_SIZE = 16;
const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + GCM_TAG_SIZE;

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY
  }
};

// AES 키 준비
const getAESKey = async (base64Key: string): Promise<CryptoKey> => {
  try {
    // Base64 디코딩
    const decodedKey = atob(base64Key);
    // 바이너리 데이터로 변환
    const keyBytes = new Uint8Array(decodedKey.length);
    for (let i = 0; i < decodedKey.length; i++) {
      keyBytes[i] = decodedKey.charCodeAt(i);
    }

    // 키를 직접 AES-GCM 키로 변환
    return await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
  } catch (e) {
    console.error('Failed to process AES key:', e);
    throw e;
  }
};

export const getMimeType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: { [key: string]: string } = {
    // 이미지
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // 비디오
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',
    // 오디오
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'oga': 'audio/ogg',
    // 문서
    'pdf': 'application/pdf',
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

export const handleDecryption = async (encryptedData: Uint8Array): Promise<ArrayBuffer> => {
  try {
    console.log('원본 데이터 형식:', {
      타입: Object.prototype.toString.call(encryptedData),
      길이: encryptedData.length,
      처음16바이트: Array.from(encryptedData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    // GCM 모드의 nonce 크기는 12바이트
    const nonceSize = 12;
    const nonce = encryptedData.slice(0, nonceSize);
    const ciphertext = encryptedData.slice(nonceSize);

    console.log('복호화 준비:', {
      논스크기: nonce.length,
      암호문크기: ciphertext.length,
      논스: Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join(' '),
      암호문시작: Array.from(ciphertext.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    // AES 키 생성 및 복호화
    const key = await getAESKey(import.meta.env.VITE_AES_KEY);
    console.log('AES 키 준비 완료');

    // 청크 단위로 복호화
    const CHUNK_SIZE = 1024 * 1024 + 16; // 1MB + GCM 태그 크기
    const chunks: ArrayBuffer[] = [];
    
    for (let offset = 0; offset < ciphertext.length; offset += CHUNK_SIZE) {
      const end = Math.min(offset + CHUNK_SIZE, ciphertext.length);
      const encryptedChunk = ciphertext.slice(offset, end);

      console.log('청크 복호화:', {
        offset,
        size: encryptedChunk.length
      });

      const decryptedChunk = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          tagLength: 128
        },
        key,
        encryptedChunk
      );

      chunks.push(decryptedChunk);
    }

    // 모든 청크 합치기
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let writeOffset = 0;
    
    for (const chunk of chunks) {
      result.set(new Uint8Array(chunk), writeOffset);
      writeOffset += chunk.byteLength;
    }

    console.log('복호화 완료, 크기:', result.byteLength);
    return result.buffer;
  } catch (error) {
    console.error('복호화 중 오류:', error);
    throw error;
  }
};

export const getFileTypeLabel = (type: string) => {
  const labels: { [key: string]: string } = {
    'image': '이미지 파일',
    'video': '비디오 파일',
    'document': '문서 파일',
    'archive': '압축 파일',
    'audio': '오디오 파일',
    'code': '코드 파일',
    'other': '기타 파일'
  };
  return labels[type] || '기타 파일';
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 
