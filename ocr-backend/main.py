"""
OCR Backend Server - iTongQuiz
FastAPI server để trích xuất text từ PDF
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
import pytesseract
from PIL import Image
import io
import tempfile
import os

app = FastAPI(
    title="iTongQuiz OCR API",
    description="API để trích xuất text từ PDF sử dụng pdfplumber và Tesseract OCR",
    version="1.0.0"
)

# CORS cho phép frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production nên giới hạn origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExtractResponse(BaseModel):
    success: bool
    text: str
    pages: int
    method: str  # "native" hoặc "ocr"

class HealthResponse(BaseModel):
    status: str
    tesseract_available: bool

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Kiểm tra trạng thái server"""
    tesseract_ok = False
    try:
        pytesseract.get_tesseract_version()
        tesseract_ok = True
    except:
        pass
    
    return HealthResponse(
        status="ok",
        tesseract_available=tesseract_ok
    )

@app.post("/extract", response_model=ExtractResponse)
async def extract_text_from_pdf(file: UploadFile = File(...)):
    """
    Trích xuất text từ file PDF
    
    - Thử native extraction trước (pdfplumber)
    - Nếu không có text, dùng OCR (Tesseract)
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF")
    
    try:
        # Đọc file upload
        content = await file.read()
        
        extracted_text = ""
        page_count = 0
        method = "native"
        
        # Tạo temp file để xử lý
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Thử native extraction với pdfplumber
            with pdfplumber.open(tmp_path) as pdf:
                page_count = len(pdf.pages)
                
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n\n"
            
            # Nếu không có text, thử OCR
            if not extracted_text.strip():
                method = "ocr"
                extracted_text = ""
                
                with pdfplumber.open(tmp_path) as pdf:
                    for page in pdf.pages:
                        # Chuyển page thành image
                        img = page.to_image(resolution=300)
                        pil_image = img.original
                        
                        # OCR với Tesseract (hỗ trợ tiếng Việt)
                        text = pytesseract.image_to_string(
                            pil_image, 
                            lang='vie+eng',  # Tiếng Việt + Tiếng Anh
                            config='--psm 6'  # Assume uniform block of text
                        )
                        
                        if text:
                            extracted_text += text + "\n\n"
        
        finally:
            # Xóa temp file
            os.unlink(tmp_path)
        
        return ExtractResponse(
            success=True,
            text=extracted_text.strip(),
            pages=page_count,
            method=method
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý PDF: {str(e)}")

@app.post("/extract-images")
async def extract_images_from_pdf(file: UploadFile = File(...)):
    """
    Trích xuất images từ PDF (cho các bài tập có hình ảnh)
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file PDF")
    
    try:
        content = await file.read()
        images_data = []
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            with pdfplumber.open(tmp_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    images = page.images
                    for img_idx, img in enumerate(images):
                        images_data.append({
                            "page": page_num,
                            "index": img_idx,
                            "bbox": img.get("bbox"),
                            "width": img.get("width"),
                            "height": img.get("height")
                        })
        finally:
            os.unlink(tmp_path)
        
        return {
            "success": True,
            "image_count": len(images_data),
            "images": images_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý PDF: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
