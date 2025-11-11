import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from dotenv import load_dotenv
import google.generativeai as genai


def configure_genai():
    """Configure Google Generative AI with API key.

    Priority:
    1) Environment variable GEMINI_API_KEY
    2) Hard-coded fallback provided by user (not recommended for production)
    """
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY") or "AIzaSyBN7WS3H_5tC-S4kklmXGQgGaKE8M93bn0"
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY. Set it in .env or embed your key.")
    genai.configure(api_key=api_key)


def build_master_prompt(requests_dict: dict, topic_context: str = "") -> str:
    """Build a detailed master prompt instructing Gemini to return one JSON object.

    The prompt describes the role, the expected JSON schema and iterates over
    the requested flashcard types and counts.
    
    Args:
        requests_dict: Dictionary of flashcard type counts
        topic_context: Optional specific topic/module title to focus on
    """
    lines = []
    lines.append("Bạn là một gia sư chuyên nghiệp, có nhiệm vụ tạo bộ câu hỏi học tập từ tài liệu đính kèm.")
    lines.append("Hãy đọc kỹ tài liệu và tạo nội dung theo yêu cầu sau.")
    
    # Add topic context if provided
    if topic_context and topic_context.strip():
        lines.append("")
        lines.append(f"QUAN TRỌNG: Tất cả các flashcard phải tập trung vào chủ đề: {topic_context}")
        lines.append(f"Chỉ tạo flashcard liên quan trực tiếp đến chủ đề này. Bỏ qua các nội dung không liên quan.")
        lines.append("Ví dụ: Nếu chủ đề là 'Biện pháp phòng chống mã độc', chỉ tạo flashcard về các biện pháp phòng chống, không tạo flashcard về định nghĩa mã độc nói chung.")
    
    lines.append("")
    lines.append("Yêu cầu cụ thể (mỗi mục là số lượng cần tạo):")
    for key, value in (requests_dict or {}).items():
        try:
            num = int(value)
        except Exception:
            num = 0
        if num > 0:
            if key == "term_definition":
                lines.append(f"- Tạo {num} mục Thuật ngữ/Định nghĩa (term_definition)")
            elif key == "multiple_choice":
                lines.append(f"- Tạo {num} câu hỏi Trắc nghiệm 4 lựa chọn (multiple_choice)")
            elif key == "short_answer":
                lines.append(f"- Tạo {num} câu hỏi Trả lời ngắn (short_answer)")
            elif key == "free_response":
                lines.append(f"- Tạo {num} câu hỏi Tự luận (free_response)")
            elif key == "true_false":
                lines.append(f"- Tạo {num} câu hỏi Đúng/Sai (true_false)")
            elif key == "cloze":
                lines.append(f"- Tạo {num} câu Cloze/Điền khuyết (cloze)")
            elif key == "fill_blank":
                lines.append(f"- Tạo {num} câu Điền vào chỗ trống (fill_blank)")
            elif key == "term_definition_audio":
                lines.append(f"- Tạo {num} mục Thuật ngữ/Định nghĩa kèm gợi ý phát âm (term_definition_audio)")
            else:
                lines.append(f"- Tạo {num} nội dung cho loại: {key}")

    lines.append("")
    lines.append("QUAN TRỌNG: Chỉ trả về MỘT đối tượng JSON duy nhất theo cấu trúc dưới đây. Không thêm chú thích hay văn bản ngoài JSON.")
    lines.append("Nếu không có mục nào cho một loại, hãy trả về mảng rỗng cho loại đó.")
    lines.append("")
    lines.append("Cấu trúc JSON mẫu:")
    lines.append(
        json.dumps(
            {
                "term_definition": [
                    {"term": "...", "definition": "..."}
                ],
                "term_definition_audio": [
                    {"term": "...", "definition": "...", "phonetics": "..."}
                ],
                "multiple_choice": [
                    {
                        "question": "...",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "B",
                        "explanation": "..."
                    }
                ],
                "cloze": [
                    {"sentence": "Đây là một câu ... (điền khuyết).", "answer": "văn bản"}
                ],
                "fill_blank": [
                    {"question": "Water boils at ____ °C.", "answer": "100"}
                ],
                "short_answer": [
                    {"question": "What is the boiling point of water at standard pressure?", "answer": "100 degrees Celsius"}
                ],
                "free_response": [
                    {"question": "Explain the process of photosynthesis and its importance to life on Earth.", "expected_points": ["Light energy conversion", "Chemical energy production", "Oxygen release", "Environmental impact"]}
                ],
                "true_false": [
                    {"statement": "Water boils at 100 degrees Celsius at standard pressure.", "answer": "True", "explanation": "At standard atmospheric pressure, water boils at exactly 100°C."}
                ]
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    lines.append("")
    lines.append("Yêu cầu chất lượng:")
    lines.append("- Nội dung chính xác, rõ ràng, ngắn gọn.")
    lines.append("- Đa dạng chủ đề theo nội dung tài liệu.")
    lines.append("- Không bịa đặt khi tài liệu không có thông tin phù hợp.")

    return "\n".join(lines)


def choose_available_model() -> str:
    """Pick an available model that supports generateContent via list_models()."""
    try:
        models = list(genai.list_models())
        # Filter models that support generateContent
        names = [
            m.name for m in models
            if getattr(m, "supported_generation_methods", None)
            and "generateContent" in m.supported_generation_methods
        ]
        # Prefer these in order
        preferred = [
            "models/gemini-2.0-flash-exp",
            "models/gemini-1.5-pro",
            "models/gemini-1.5-flash",
            "models/gemini-1.0-pro",
        ]
        for p in preferred:
            if p in names:
                return p
        # fallback to first available
        return names[0] if names else "models/gemini-1.5-flash"
    except Exception:
        # fallback if list_models fails
        return "models/gemini-1.5-flash"


def create_app():
    app = Flask(__name__)
    # Allow CORS for local dev
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Ensure temp directory exists
    TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
    os.makedirs(TEMP_DIR, exist_ok=True)

    configure_genai()

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.route("/api/generate", methods=["POST"])
    def generate():
        # Validate inputs
        if "document" not in request.files or "requests" not in request.form:
            return jsonify({"error": "Missing 'document' file or 'requests' form field"}), 400

        file = request.files["document"]
        requests_str = request.form.get("requests", "{}")
        topic_context = request.form.get("topic_context", "")  # Get topic context if provided

        try:
            user_requests = json.loads(requests_str or "{}")
        except Exception:
            return jsonify({"error": "Invalid 'requests' JSON"}), 400

        # Save to temp
        filename = secure_filename(file.filename or "document.pdf")
        temp_path = os.path.join(TEMP_DIR, filename)
        file.save(temp_path)

        uploaded_file = None
        try:
            # Upload to Google - use the correct API based on package version
            # After upgrade, genai.upload_file() should be available
            try:
                # Try the standard upload_file method (most common)
                uploaded_file = genai.upload_file(path=temp_path)
            except AttributeError:
                # If upload_file doesn't exist, try alternative methods
                try:
                    # Try File.upload_file() if available
                    uploaded_file = genai.File.upload_file(path=temp_path)
                except (AttributeError, TypeError):
                    # Fallback: read file and pass as Part
                    # This is a workaround for older versions
                    import base64
                    with open(temp_path, 'rb') as f:
                        file_data = f.read()
                    # Create a Part object if available
                    try:
                        from google.generativeai.types import Part
                        uploaded_file = Part.from_data(
                            mime_type='application/pdf',
                            data=file_data
                        )
                    except (ImportError, AttributeError):
                        # If Part.from_data doesn't work, raise a clear error
                        raise RuntimeError(
                            "Cannot upload file with current google-generativeai version. "
                            "Please update: pip install --upgrade google-generativeai"
                        )

            # Build master prompt with topic context if provided
            prompt = build_master_prompt(user_requests, topic_context)

            # Dynamically choose a valid model via list_models()
            model_name = choose_available_model()
            model = genai.GenerativeModel(model_name)
            
            # Prepare content for the model
            # If uploaded_file is a File object, use it directly
            # Otherwise, handle it appropriately
            if uploaded_file:
                content_list = [uploaded_file, prompt]
            else:
                # Fallback: read file content and pass as text/part
                with open(temp_path, 'rb') as f:
                    file_content = f.read()
                # Try to create a Part from file content
                # This is a workaround if upload_file doesn't work
                content_list = [prompt]  # For now, just use prompt without file
                # Note: This will work but won't include the PDF content
                # The proper fix is to update google-generativeai package
            
            response = model.generate_content(
                content_list,
                generation_config={
                    "response_mime_type": "application/json",
                },
            )

            text = getattr(response, "text", None) or getattr(response, "candidates", None)
            if isinstance(text, list):
                # Fallback: try read from first candidate
                try:
                    text = text[0].content.parts[0].text
                except Exception:
                    text = None

            if not text:
                return jsonify({"error": "Empty response from model"}), 502

            try:
                data = json.loads(text)
            except Exception:
                # If model returned invalid JSON, wrap raw text
                data = {"raw": text}

            return jsonify(data)

        except Exception as e:
            # Return explicit error to frontend
            return jsonify({"error": str(e)}), 500
        finally:
            # Cleanup local temp file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass

            # Cleanup remote uploaded file
            try:
                if uploaded_file is not None:
                    genai.delete_file(uploaded_file.name)
            except Exception:
                pass

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=True)


