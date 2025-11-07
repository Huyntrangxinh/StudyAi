import express from 'express';
import fs from 'fs';
import path from 'path';
const config = require('../../config');
import crypto from 'crypto';

const router = express.Router();

// ========= Topic Classification System =========
type TopicType =
    | 'biology' | 'chemistry' | 'physics' | 'math.algebra' | 'math.calculus' | 'math.geometry'
    | 'cs.ml' | 'cs.programming' | 'cs.network' | 'cs.security' | 'economics' | 'history' | 'geography'
    | 'civics' | 'literature' | 'language' | 'psychology' | 'environment' | 'astronomy'
    | 'earth_science' | 'medicine' | 'statistics' | 'philosophy' | 'business' | 'unknown';

type TopicHit = { type: TopicType; weight: number; subtype?: string };

function classifyTopic(raw: string, lang: 'vi' | 'en' = 'vi'): TopicHit {
    const p = (raw || '').toLowerCase().normalize('NFC');

    const add = (ok: boolean, type: TopicType, weight = 1, subtype?: string): TopicHit | null =>
        ok ? { type, weight, subtype } : null;

    // ===== VI & EN keyword banks =====
    const bank: Array<TopicHit | null> = [
        // Biology
        add(/quang\s*hợp|photosynthesis|hô\s*hấp\s*tế\s*bào|cellular\s*respiration|ribisco|chloroplast|lục\s*lạp|enzyme|dna|rna|protein|gene|osmosis|mitosis|meiosis/.test(p), 'biology', 5,
            /quang\s*hợp|photosynthesis/.test(p) ? 'photosynthesis' : undefined),
        // Chemistry
        add(/hóa|chemistry|acid|base|axit|bazơ|titration|redox|oxi.hóa|khử|stoichiometry|covalent|ionic/.test(p), 'chemistry', 3),
        // Physics (subtypes)
        add(/định\s*luật\s*(ii|2|hai)\s*newton|newton'?s?\s*second\s*law|f\s*=\s*m\s*·?\s*a/.test(p), 'physics', 5, 'newton2'),
        add(/điện\s*trường|điện\s*thế|coulomb|faraday|maxwell|electric|magnetic|wave|quang\s*học|optics/.test(p), 'physics', 3),
        // Math
        add(/phương\s*trình\s*bậc\s*hai|quadratic|parabola|vị\s*phân|đạo\s*hàm|derivative|integral|limit|tích\s*phân/.test(p), 'math.calculus', 4),
        add(/phương\s*trình|bất\s*phương\s*trình|hàm\s*số|algebra|matrix|determinant|vector/.test(p), 'math.algebra', 3),
        add(/hình\s*học|geometry|tam\s*giác|circle|góc|định\s*lý/.test(p), 'math.geometry', 3),
        // CS
        add(/machine\s*learning|deep\s*learning|neural\s*network|regression|classification|overfitting|gradient\s*boost/.test(p), 'cs.ml', 5),
        add(/algorithm|big\s*o|data\s*structure|hash|sorting|pointer|programming|compiler/.test(p), 'cs.programming', 3),
        add(/tcp|udp|ip|osi|http|dns|socket|network/.test(p), 'cs.network', 3),
        // CS - Security (MỚI THÊM)
        add(/virus\s*(máy\s*tính)?|computer\s*virus|malware|ransomware|trojan|worm|spyware|phishing|cyber\s*security|hack|firewall|encryption|mã\s*hóa|bảo\s*mật|tấn\s*công\s*mạng|an\s*ninh\s*mạng|backdoor|rootkit|keylogger|ddos|sql\s*injection|xss|vulnerability|exploit/.test(p), 'cs.security', 6),
        // Economics / Business
        add(/cung\s*cầu|supply\s*and\s*demand|lạm\s*phát|inflation|gdp|kinh\s*tế|economics|market/.test(p), 'economics', 3),
        add(/marketing|product\s*manager|business\s*model|revenue|unit\s*economics/.test(p), 'business', 2),
        // Others
        add(/thiên\s*văn|vũ\s*trụ|astronomy|planet|galaxy|nebula/.test(p), 'astronomy', 2),
        add(/địa\s*chất|động\s*đất|núi\s*lửa|earth\s*science|tectonic/.test(p), 'earth_science', 2),
        add(/môi\s*trường|biến\s*đổi\s*khí\s*hậu|carbon\s*footprint|environment/.test(p), 'environment', 2),
        add(/tâm\s*lý|psychology|cognitive|behavior/.test(p), 'psychology', 2),
        add(/thống\s*kê|statistics|probability|bayes|distribution/.test(p), 'statistics', 3),
        add(/văn\s*học|literature|poem|novel|symbolism|nghị\s*luận/.test(p), 'literature', 2),
        add(/lịch\s*sử|history|world\s*war|revolution|dynasty|cách\s*mạng/.test(p), 'history', 2),
        add(/địa\s*lý|geography|địa\s*lí|population|climate|river|plateau/.test(p), 'geography', 2),
        add(/công\s*dân|civics|hiến\s*pháp|constitution|law|rights/.test(p), 'civics', 2),
        add(/y\s*học|medicine|pathology|anatomy|physiology|pharmacology/.test(p), 'medicine', 2),
        add(/triết\s*học|philosophy|ethics|epistemology|logic/.test(p), 'philosophy', 2),
        add(/tiếng\s*anh|ielts|toeic|ngôn\s*ngữ|grammar|vocabulary/.test(p), 'language', 2),
    ];

    const best = bank.filter(Boolean).sort((a, b) => (b!.weight) - (a!.weight))[0];
    return best || { type: 'unknown', weight: 0 };
}

// Comprehensive subject-specific instructions
const getDetailedInstruction = (prompt: string, language: string = 'vi'): string => {
    const hit = classifyTopic(prompt, language as 'vi' | 'en');
    const t = hit.type;
    const sub = hit.subtype;

    const ONLY_EN = `**MANDATORY: Write ENTIRELY in ENGLISH. Do NOT use Vietnamese, Vietnamese words, or mix languages.**`;
    const ONLY_VI = `**BẮT BUỘC: Viết HOÀN TOÀN bằng tiếng Việt có dấu. Không dùng tiếng Anh, không trộn ngôn ngữ.**`;

    const head = language === 'en'
        ? `You are a veteran high-school teacher. Create a COMPLETE, DETAILED EXPLAINER about: "${prompt}". ${ONLY_EN}

🚨 ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
- Length: MINIMUM 500 words, target 600-700 words (MANDATORY - this is for a 2-3 minute video)
- Write AT LEAST 500 words. If you write less, you will fail the task.
- NO greetings, NO introductions like "Hello" or "Today we will"
- NO headings, NO bullet points, NO markdown
- Write as continuous prose with clear transitions
- Start IMMEDIATELY with the definition/concept
- Include detailed explanations, examples with numbers, and step-by-step analysis
- Expand on each point with concrete details and examples
- This is NOT a summary or outline - write the FULL, COMPLETE lesson content
- If your response is less than 500 words, you MUST continue writing until you reach at least 500 words`
        : `Bạn là giáo viên THPT giàu kinh nghiệm. Soạn BÀI GIẢI THÍCH ĐẦY ĐỦ, CHI TIẾT về: "${prompt}". ${ONLY_VI}

🚨 YÊU CẦU TUYỆT ĐỐI - KHÔNG CÓ NGOẠI LỆ:
- Độ dài: TỐI THIỂU 500 từ, mục tiêu 600-700 từ (BẮT BUỘC - cho video 2-3 phút)
- Viết ÍT NHẤT 500 từ. Nếu viết ít hơn, bạn sẽ thất bại nhiệm vụ.
- KHÔNG lời chào, KHÔNG mở đầu như "Xin chào" hoặc "Hôm nay chúng ta"
- KHÔNG tiêu đề, KHÔNG bullet points, KHÔNG markdown
- Viết như văn bản liền mạch, chuyển ý rõ ràng
- BẮT ĐẦU NGAY với định nghĩa/khái niệm
- Bao gồm giải thích chi tiết, ví dụ có số liệu, và phân tích từng bước
- Mở rộng từng điểm với chi tiết cụ thể và ví dụ
- Đây KHÔNG phải tóm tắt hoặc dàn ý - viết TOÀN BỘ, ĐẦY ĐỦ nội dung bài học
- Nếu câu trả lời của bạn ít hơn 500 từ, bạn PHẢI tiếp tục viết cho đến khi đạt ít nhất 500 từ`;

    const by = (vi: string, en: string) => language === 'en' ? en : vi;

    // Biology
    if (t === 'biology') {
        const extra = (sub === 'photosynthesis')
            ? by(
                `Trọng tâm: hai pha (sáng/Calvin), vị trí (màng tilakoid/chất nền), phương trình tổng quát, vai trò RuBisCO, ATP/NADPH, yếu tố ảnh hưởng (ánh sáng, CO2, nhiệt độ), thí nghiệm bọt O2, ứng dụng nhà kính/quang hợp nhân tạo. Trình bày theo chuỗi: định nghĩa → cơ chế từng pha → phương trình → yếu tố ảnh hưởng → quan sát/thí nghiệm → ứng dụng → tổng kết & lỗi hiểu lầm.`,
                `Focus: two stages (light/Calvin), locations (thylakoid/stroma), overall equation, role of RuBisCO, ATP/NADPH, limiting factors (light, CO2, temperature), bubbling experiment, greenhouse/artificial photosynthesis. Order: definition → stage-by-stage mechanism → equation → limiting factors → observation/experiment → applications → conclusion & misconceptions.`)
            : by(
                `Mô tả cơ chế phân tử (bào quan/liên quan enzyme), điều kiện, phương trình khái quát, ví dụ thực nghiệm, ứng dụng và liên hệ sinh thái.`,
                `Describe molecular mechanism (organelles/enzymes), conditions, overall equation, experimental example, applications and ecological link.`);
        return `${head}\n${extra}\nAvoid generic phrases. Start directly with the core definition and why it matters in context.`;
    }

    // Physics
    if (t === 'physics') {
        const extra = (sub === 'newton2')
            ? by(
                `Trình bày phát biểu và ý nghĩa vectơ của F = m·a; khái niệm HỢP LỰC; điều kiện áp dụng (hệ quán tính). Làm 2 ví dụ số có kết quả; nêu thí nghiệm xe lăn – máng trượt; chỉ rõ sai lầm hay gặp (nhầm hợp lực, quên ma sát, đơn vị).`,
                `State and interpret vector form of F = m·a; define NET FORCE; conditions (inertial frame). Include two solved numeric examples; describe cart–track experiment; list common mistakes (confusing single force vs net, ignoring friction, units).`)
            : by(
                `Trình bày công thức cốt lõi, điều kiện áp dụng, ví dụ số có kết quả, thí nghiệm kiểm chứng, lỗi hay gặp.`,
                `Provide core formulas, conditions, solved numeric examples, an experiment description, and common pitfalls.`);
        return `${head}\n${extra}`;
    }

    // Math
    if (t.startsWith('math.')) {
        const seg = t === 'math.calculus'
            ? by(
                `PHẦN 1 - ĐỊNH NGHĨA & CÔNG THỨC (50-70 từ): Định nghĩa chính xác về giới hạn/đạo hàm/tích phân, ký hiệu, đơn vị. Tại sao quan trọng trong toán học và ứng dụng.

PHẦN 2 - LÝ THUYẾT CHI TIẾT (250-320 từ - TRỌNG TÂM): Giải thích trực giác hình học đằng sau khái niệm. Công thức cốt lõi và các biến thể. Quy tắc tính toán từng bước. Điều kiện áp dụng và các trường hợp đặc biệt. Mối liên hệ với các khái niệm toán học khác. Ví dụ số cụ thể với giải thích từng bước và kết quả cuối cùng.

PHẦN 3 - PHƯƠNG PHÁP GIẢI (80-100 từ): Các dạng bài tập phổ biến. Phương pháp giải từng dạng. Ví dụ minh họa có lời giải đầy đủ.

PHẦN 4 - KIỂM TRA & XÁC MINH (40-50 từ): Cách kiểm tra miền xác định, kiểm tra nghiệm, xác minh bằng hình học hoặc tính toán ngược.

PHẦN 5 - LỖI THƯỜNG GẶP & MẸO (30-40 từ): Các lỗi đại số thường gặp, cách tránh, và mẹo ghi nhớ.`,
                `PART 1 - DEFINITION & FORMULA (50-70 words): Precise definition of limits/derivatives/integrals, notation, units. Why it's important in mathematics and applications.

PART 2 - DETAILED THEORY (250-320 words - FOCUS): Explain the geometric intuition behind the concept. Core formulas and variants. Step-by-step computation rules. Conditions for application and special cases. Connection with other mathematical concepts. A concrete numerical example with step-by-step explanation and final result.

PART 3 - SOLUTION METHODS (80-100 words): Common problem types. Solution methods for each type. A fully worked example.

PART 4 - VERIFICATION & CHECKS (40-50 words): How to check the domain, verify solutions, validate using geometry or reverse computation.

PART 5 - COMMON MISTAKES & TIPS (30-40 words): Common algebraic errors, how to avoid them, and memorization tips.`)
            : t === 'math.algebra'
                ? by(
                    `PHẦN 1 - ĐỊNH NGHĨA & KHÁI NIỆM (50-70 từ): Định nghĩa chính xác về ${prompt}, ký hiệu toán học, thuật ngữ chuyên ngành. Vị trí trong chương trình đại số. Tại sao quan trọng.

PHẦN 2 - LÝ THUYẾT CHI TIẾT (250-320 từ - TRỌNG TÂM): Công thức cốt lõi và các dạng biến thể. Trực giác hình học nếu có (ví dụ: parabol cho hàm bậc hai). Các quy tắc biến đổi đại số chuẩn từng bước. Điều kiện áp dụng và các trường hợp đặc biệt. Mối liên hệ với các khái niệm toán học khác. Ví dụ số cụ thể với giải thích đầy đủ từng bước, từ đầu vào đến kết quả cuối cùng, bao gồm cả kiểm tra.

PHẦN 3 - CÁC DẠNG BÀI TẬP (80-100 từ): Liệt kê 3-4 dạng bài tập phổ biến. Phương pháp giải từng dạng. Ví dụ minh họa một dạng với lời giải đầy đủ.

PHẦN 4 - KIỂM TRA NGHIỆM & ĐIỀU KIỆN (40-50 từ): Cách kiểm tra miền xác định, kiểm tra nghiệm có đúng không, xác minh bằng thay số hoặc hình học.

PHẦN 5 - LỖI THƯỜNG GẶP & GHI NHỚ (30-40 từ): Các lỗi đại số thường gặp (nhầm dấu, quên điều kiện, tính toán sai). Cách tránh và mẹo ghi nhớ.`,
                    `PART 1 - DEFINITION & CONCEPT (50-70 words): Precise definition of ${prompt}, mathematical notation, terminology. Position in algebra curriculum. Why it's important.

PART 2 - DETAILED THEORY (250-320 words - FOCUS): Core formulas and variants. Geometric intuition if applicable (e.g., parabola for quadratic functions). Standard algebraic manipulation rules step by step. Conditions for application and special cases. Connection with other mathematical concepts. A concrete numerical example with full step-by-step explanation, from input to final result, including verification.

PART 3 - PROBLEM TYPES (80-100 words): List 3-4 common problem types. Solution methods for each type. A fully worked example of one type.

PART 4 - SOLUTION VERIFICATION & CONDITIONS (40-50 words): How to check the domain, verify solutions are correct, validate by substitution or geometry.

PART 5 - COMMON MISTAKES & MEMORIZATION (30-40 words): Common algebraic errors (sign errors, forgetting conditions, computation mistakes). How to avoid them and memorization tips.`)
                : by(
                    `PHẦN 1 - ĐỊNH NGHĨA & CÔNG THỨC (50-70 từ): Định nghĩa hình học chính xác, ký hiệu, thuật ngữ. Tại sao quan trọng.

PHẦN 2 - LÝ THUYẾT CHI TIẾT (250-320 từ - TRỌNG TÂM): Giải thích trực giác hình học trực quan. Công thức then chốt và cách chứng minh hoặc suy luận. Các trường hợp đặc biệt. Mối liên hệ với các định lý khác. Ví dụ dựng hình hoặc giải bài có số liệu cụ thể với giải thích từng bước.

PHẦN 3 - ỨNG DỤNG (80-100 từ): Các bài toán thực tế sử dụng kiến thức này. Ví dụ minh họa.

PHẦN 4 - XÁC MINH HÌNH HỌC (40-50 từ): Cách kiểm tra bằng hình học, đo đạc, hoặc tính toán.

PHẦN 5 - MẸO GHI NHỚ (30-40 từ): Cách nhớ công thức và áp dụng đúng.`,
                    `PART 1 - DEFINITION & FORMULA (50-70 words): Precise geometric definition, notation, terminology. Why it's important.

PART 2 - DETAILED THEORY (250-320 words - FOCUS): Explain geometric intuition clearly. Key formulas and how to prove or derive them. Special cases. Connection with other theorems. A numerical construction or solution example with step-by-step explanation.

PART 3 - APPLICATIONS (80-100 words): Real-world problems using this knowledge. An example.

PART 4 - GEOMETRIC VERIFICATION (40-50 words): How to check using geometry, measurement, or computation.

PART 5 - MEMORIZATION TIPS (30-40 words): How to remember formulas and apply them correctly.`);
        return `${head}\n${seg}`;
    }

    // CS / ML
    if (t === 'cs.ml') {
        return `${head}
Explain: problem setup, data → features → model → loss → optimization → evaluation. Compare with baselines. Include a concise real example (e.g., classification), typical pitfalls (overfitting, leakage, bias), and how to validate. No lists — weave them into paragraphs.`;
    }
    if (t === 'cs.programming') {
        return `${head}
Explain the core concept, when to use it, internal mechanics, complexity, and a mental model. Include a tiny code-level walk-through in natural language (no code block). Contrast with two alternatives, and end with debugging tips.`;
    }
    if (t === 'cs.network') {
        return `${head}
Explain: protocol purpose, layer/stack position, key mechanisms (handshakes, routing, error handling), packet flow example, and common issues/security considerations.`;
    }

    // CS - Security (MỚI THÊM)
    if (t === 'cs.security') {
        return `${head}
${by(
            `PHẦN 1 - ĐỊNH NGHĨA & BỐI CẢNH (80-100 từ): Định nghĩa chính xác về ${prompt} trong lĩnh vực an ninh mạng. Giải thích nó là loại phần mềm/mối đe dọa gì, xuất hiện khi nào (lịch sử), và tại sao nó nguy hiểm. Phân biệt với các loại malware khác (virus vs worm vs trojan).

PHẦN 2 - CƠ CHẾ HOẠT ĐỘNG CHI TIẾT (250-350 từ - TRỌNG TÂM):
Mô tả từng bước cách ${prompt} hoạt động:
- ĐẦU VÀO: Cách nó xâm nhập hệ thống (email đính kèm, USB, tải về, lỗ hổng bảo mật)
- BIẾN ĐỔI: Những gì nó làm sau khi xâm nhập (tự sao chép, che giấu, lây lan, thực thi mã độc, thu thập dữ liệu, mã hóa file)
- ĐẦU RA: Hậu quả cho hệ thống (mất dữ liệu, hỏng file, chậm máy, bị đánh cắp thông tin, yêu cầu tiền chuộc)
- ĐIỀU KIỆN: Môi trường nào dễ bị tấn công (hệ điều hành không cập nhật, thiếu antivirus, người dùng thiếu cảnh giác)

Giải thích kỹ thuật cụ thể: cách virus đính vào file thực thi, cách worm tự lan truyền qua mạng, cách trojan ngụy trang, cách ransomware mã hóa.

PHẦN 3 - VÍ DỤ CỤ THỂ CÓ SỐ LIỆU (100-120 từ):
Kể một sự kiện tấn công nổi tiếng với số liệu thực:
- Tên virus/malware (ví dụ: WannaCry, Stuxnet, ILOVEYOU)
- Thời gian xảy ra
- Số lượng máy tính bị nhiễm
- Thiệt hại ước tính (USD)
- Cách nó lây lan
- Cách ngăn chặn/khắc phục

PHẦN 4 - BIỆN PHÁP PHÒNG CHỐNG (80-100 từ):
Liệt kê các cách bảo vệ cụ thể:
- Cài đặt và cập nhật phần mềm diệt virus
- Cập nhật hệ điều hành thường xuyên
- Không mở email/file lạ
- Sao lưu dữ liệu định kỳ
- Dùng firewall
- Tắt autorun USB
- Kiểm tra file trước khi mở

PHẦN 5 - SAI LẦM THƯỜNG GẶP & LƯU Ý (60-80 từ):
Những hiểu lầm phổ biến:
- Tưởng antivirus là đủ (cần cập nhật và cảnh giác)
- Nhầm virus với mọi loại malware
- Tưởng Mac/Linux không bị virus (ít hơn nhưng vẫn có)
- Tin vào email giả mạo
- Click vào quảng cáo/link lạ

PHẦN 6 - Ý NGHĨA & TƯƠNG LAI (40-60 từ):
Tầm quan trọng của an ninh mạng trong thời đại số. Xu hướng tấn công mới (AI-powered malware, IoT attacks). Tại sao mọi người cần hiểu về ${prompt}.`,

            `PART 1 - DEFINITION & CONTEXT (80-100 words): Precise definition of ${prompt} in cybersecurity. Explain what type of software/threat it is, when it emerged (history), and why it's dangerous. Distinguish from other malware types (virus vs worm vs trojan).

PART 2 - DETAILED MECHANISM (250-350 words - FOCUS):
Describe step-by-step how ${prompt} works:
- INPUT: How it infiltrates systems (email attachments, USB, downloads, security vulnerabilities)
- TRANSFORMATION: What it does after infiltration (self-replication, hiding, spreading, executing malicious code, data collection, file encryption)
- OUTPUT: Consequences for the system (data loss, file corruption, slowdown, information theft, ransom demands)
- CONDITIONS: Vulnerable environments (outdated OS, no antivirus, careless users)

Explain specific techniques: how viruses attach to executables, how worms self-propagate through networks, how trojans disguise, how ransomware encrypts.

PART 3 - CONCRETE EXAMPLE WITH DATA (100-120 words):
Describe a famous attack incident with real numbers:
- Malware name (e.g., WannaCry, Stuxnet, ILOVEYOU)
- Time of occurrence
- Number of infected computers
- Estimated damage (USD)
- How it spread
- How it was stopped/remediated

PART 4 - PREVENTION MEASURES (80-100 words):
List specific protection methods:
- Install and update antivirus software
- Keep OS updated regularly
- Don't open suspicious emails/files
- Regular data backups
- Use firewalls
- Disable USB autorun
- Scan files before opening

PART 5 - COMMON MISTAKES & NOTES (60-80 words):
Common misconceptions:
- Thinking antivirus is enough (need updates and vigilance)
- Confusing viruses with all malware
- Thinking Mac/Linux can't get viruses (less common but possible)
- Trusting fake emails
- Clicking suspicious ads/links

PART 6 - SIGNIFICANCE & FUTURE (40-60 words):
Importance of cybersecurity in the digital age. New attack trends (AI-powered malware, IoT attacks). Why everyone needs to understand ${prompt}.`
        )}`;
    }

    // Economics
    if (t === 'economics') {
        return `${head}
PHẦN 1 - ĐỊNH NGHĨA & KHÁI NIỆM (50-70 từ): Định nghĩa chính xác về ${prompt}, thuật ngữ kinh tế, vị trí trong lý thuyết kinh tế. Tại sao quan trọng.

PHẦN 2 - LÝ THUYẾT CHI TIẾT (250-320 từ - TRỌNG TÂM): Phát triển khái niệm trong khung cung cầu: định nghĩa cầu và cung, điều kiện ceteris paribus, cách đường cong dịch chuyển, độ co giãn giá, và cân bằng thị trường. Giải thích từng yếu tố một cách chi tiết với ví dụ minh họa. Mối liên hệ giữa các khái niệm.

PHẦN 3 - VÍ DỤ CỤ THỂ (80-100 từ): Đưa một ví dụ số cụ thể: tình huống thị trường với số liệu (số lượng, giá), phân tích từng bước cách thay đổi một yếu tố ảnh hưởng đến các yếu tố khác. Liên hệ với quyết định chính sách hoặc kinh doanh thực tế.

PHẦN 4 - ỨNG DỤNG (40-50 từ): Các ứng dụng trong thực tế, ví dụ về chính sách giá, thuế, hoặc can thiệp thị trường.

PHẦN 5 - LƯU Ý & SAI LẦM (30-40 từ): Các điểm chính cần nhớ: hiểu quan hệ giá-số lượng, yếu tố dịch chuyển đường cong, khái niệm co giãn. Sai lầm thường gặp: nhầm di chuyển dọc đường cong với dịch chuyển đường cong.`;
    }

    // Business
    if (t === 'business') {
        return `${head}
Explain the business concept, how it creates value, key metrics, a concrete company example, and common pitfalls. Connect to real-world execution.`;
    }

    // Statistics
    if (t === 'statistics') {
        return `${head}
Define the statistical object, assumptions, estimation procedure, interpretation (not just formula), a simulated or concrete example with numbers, diagnostic checks, and caveats.`;
    }

    // Environment
    if (t === 'environment') {
        return `${head}
Explain mechanism, drivers, metrics, evidence, mitigation and adaptation measures, with one local and one global example.`;
    }

    // Astronomy
    if (t === 'astronomy') {
        return `${head}
Describe the object/process, physical parameters, observation methods, and what we infer from spectra/photometry; add a historic or mission context.`;
    }

    // Earth Science
    if (t === 'earth_science') {
        return `${head}
Explain geologic process, scales of time, evidence lines, and a field/lab method to verify.`;
    }

    // Medicine
    if (t === 'medicine') {
        return `${head}
Cover pathophysiology, signs/symptoms, differential points, investigation basics, and first-line management principles (non-prescriptive).`;
    }

    // History
    if (t === 'history') {
        return `${head}
Set context (where/when/who), causes → events → consequences chain, viewpoints, and a brief historiography note.`;
    }

    // Literature
    if (t === 'literature') {
        return `${head}
Give author/context, central theme, devices (symbolism, imagery), quote-level analysis in prose (no bullets), and interpretation contrasts.`;
    }

    // Geography
    if (t === 'geography') {
        return `${head}
Explain geographic features, processes, human-environment interactions, and regional examples with specific locations.`;
    }

    // Civics
    if (t === 'civics') {
        return `${head}
Explain legal/political concept, constitutional basis, real-world application, rights/responsibilities, and a case study.`;
    }

    // Psychology
    if (t === 'psychology') {
        return `${head}
Explain psychological concept, mechanisms, experimental evidence, applications, and limitations.`;
    }

    // Philosophy
    if (t === 'philosophy') {
        return `${head}
Explain philosophical concept, key arguments, historical context, counterarguments, and implications.`;
    }

    // Language
    if (t === 'language') {
        return `${head}
Explain language concept, usage rules, examples, common mistakes, and practical tips for improvement.`;
    }

    // Chemistry
    if (t === 'chemistry') {
        return `${head}
Explain chemical concept, molecular/atomic basis, reaction mechanisms, conditions, a balanced equation example, and practical applications.`;
    }

    // Fallback for unknown topics - MUST be detailed like user's example
    const detailedGeneric = language === 'en'
        ? `You MUST follow this EXACT structure for ANY topic:

PART 1 - DEFINITION & CONTEXT (80-100 words):
Start IMMEDIATELY with the precise definition of "${prompt}". Explain where/which phase/context it occurs. Provide the exact terminology and why this concept matters.

PART 2 - STEP-BY-STEP MECHANISM (250-350 words - MAIN FOCUS):
Describe the mechanism in detail, step by step. Clearly specify:
- Input: What goes into the process/system
- Transformation: What changes occur, how they happen
- Output: What results from the process
- Conditions/Assumptions: Under what conditions this works

Include concrete details, explain each step thoroughly, and connect them logically.

PART 3 - CONCRETE EXAMPLE (100-120 words):
Provide a specific, observable/measurable example. If possible, include numbers, data, or quantifiable results. Walk through the example step by step, showing how it demonstrates the concept.

PART 4 - LIMITATIONS & COMMON MISCONCEPTIONS (60-80 words):
List one or two limitations of this concept. Explain common misunderstandings or mistakes people make when learning about it. Clarify why these misconceptions occur and how to avoid them.

PART 5 - SIGNIFICANCE & MEMORIZATION TIP (40-60 words):
Explain the real-world significance and importance of "${prompt}". Provide a short, memorable tip or mnemonic to help remember the key concept.

PART 6 - PRACTICAL APPLICATIONS (80-100 words):
Consider how this concept appears in everyday life, scientific research, and professional fields. Give concrete examples from different contexts. Connect this knowledge to related topics to build comprehensive understanding.

Remember: Write as continuous prose with smooth transitions. NO headings, NO bullet points, NO markdown. The total must be at least 600-700 words.`
        : `Bạn PHẢI tuân theo cấu trúc CHÍNH XÁC này cho BẤT KỲ chủ đề nào:

PHẦN 1 - ĐỊNH NGHĨA & BỐI CẢNH (80-100 từ):
BẮT ĐẦU NGAY với định nghĩa chính xác về "${prompt}". Nêu nơi/pha/bối cảnh nó diễn ra. Đưa ra thuật ngữ chính xác và tại sao khái niệm này quan trọng.

PHẦN 2 - CƠ CHẾ TỪNG BƯỚC (250-350 từ - TRỌNG TÂM):
Mô tả cơ chế chi tiết, từng bước. Chỉ rõ:
- Đầu vào: Những gì đi vào quá trình/hệ thống
- Biến đổi: Những thay đổi gì xảy ra, cách chúng diễn ra
- Đầu ra: Kết quả gì từ quá trình
- Điều kiện/Giả thiết: Dưới điều kiện nào điều này hoạt động

Bao gồm chi tiết cụ thể, giải thích từng bước kỹ lưỡng, và kết nối chúng một cách logic.

PHẦN 3 - VÍ DỤ CỤ THỂ (100-120 từ):
Đưa ra một ví dụ cụ thể, có thể quan sát/đo lường được. Nếu có thể, bao gồm số liệu, dữ liệu, hoặc kết quả có thể định lượng. Đi qua ví dụ từng bước, cho thấy nó minh họa khái niệm như thế nào.

PHẦN 4 - HẠN CHẾ & NHẦM LẪN THƯỜNG GẶP (60-80 từ):
Liệt kê một hoặc hai hạn chế của khái niệm này. Giải thích những hiểu lầm hoặc sai lầm phổ biến mà mọi người mắc phải khi học về nó. Làm rõ tại sao những hiểu lầm này xảy ra và cách tránh chúng.

PHẦN 5 - Ý NGHĨA & MẸO GHI NHỚ (40-60 từ):
Giải thích ý nghĩa và tầm quan trọng thực tế của "${prompt}". Đưa ra một mẹo ngắn gọn, dễ nhớ để giúp ghi nhớ khái niệm chính.

PHẦN 6 - ỨNG DỤNG THỰC TẾ (80-100 từ):
Xem xét cách khái niệm này xuất hiện trong đời sống hàng ngày, nghiên cứu khoa học, và các lĩnh vực chuyên nghiệp. Đưa ra ví dụ cụ thể từ các bối cảnh khác nhau. Kết nối kiến thức này với các chủ đề liên quan để xây dựng hiểu biết toàn diện.

Nhớ: Viết như văn bản liền mạch với chuyển ý mượt mà. KHÔNG có tiêu đề, KHÔNG bullet points, KHÔNG markdown. Tổng cộng phải ít nhất 600-700 từ.`;

    return `${head}\n${detailedGeneric}`;
}

// Enhanced emergency fallback with detailed content
const getEmergencyFallback = (prompt: string, language: string = 'vi'): string => {
    const hit = classifyTopic(prompt, language as 'vi' | 'en');
    const t = hit.type;
    const sub = hit.subtype;
    const p = prompt.trim();

    const mk = (intro: string, mech: string, ex: string, sum: string) =>
        `${intro} ${mech} ${ex} ${sum}`.replace(/\s+/g, ' ').trim();

    // Biology - Photosynthesis
    if (t === 'biology' && sub === 'photosynthesis') {
        return language === 'en'
            ? mk(
                `Photosynthesis is the process by which plants, algae and some bacteria use light energy to convert carbon dioxide and water into glucose and oxygen, occurring mainly in chloroplasts.`,
                `It proceeds in two linked stages. In the light reactions on thylakoid membranes, chlorophyll absorbs photons, water is split (photolysis) releasing oxygen; electron transport builds a proton gradient to synthesize ATP and reduces NADP+ to NADPH. In the Calvin cycle in the stroma, the enzyme RuBisCO fixes CO2 onto RuBP; the unstable six-carbon intermediate yields two 3-carbon molecules that are reduced using ATP and NADPH to form sugars, while RuBP is regenerated.`,
                `A classroom observation uses an aquatic plant under strong light: oxygen bubbles rise from leaves. The overall equation is 6CO2 + 6H2O → C6H12O6 + 6O2. Rate increases with light and CO2 to a limit and is optimal near 25–30°C; drought or chlorophyll deficiency lowers it.`,
                `In short, photosynthesis couples solar energy to biosphere metabolism; remember the two stages, the ATP/NADPH shuttle, and typical limiting factors.`)
            : mk(
                `Quang hợp là quá trình thực vật, tảo và một số vi khuẩn dùng năng lượng ánh sáng để biến CO2 và H2O thành đường và O2, diễn ra chủ yếu ở lục lạp.`,
                `Quá trình gồm hai pha liên kết. Pha sáng tại màng tilakoid: diệp lục hấp thụ photon, nước bị quang phân li giải phóng O2; chuỗi truyền electron tạo chênh lệch proton để tổng hợp ATP và khử NADP+ thành NADPH. Pha tối (chu trình Calvin) ở chất nền: RuBisCO cố định CO2 lên RuBP, hợp chất 6C tách thành 3C rồi được ATP, NADPH khử thành đường; RuBP được tái sinh.`,
                `Thí nghiệm quan sát: cây thủy sinh dưới đèn mạnh tạo bọt O2 từ lá. Phương trình tổng quát 6CO2 + 6H2O → C6H12O6 + 6O2. Tốc độ tăng theo ánh sáng và CO2 tới ngưỡng, tối ưu 25–30°C; thiếu nước/diệp lục làm giảm hiệu suất.`,
                `Tóm lại, quang hợp nối năng lượng Mặt Trời với sự sống; ghi nhớ hai pha, vai trò ATP/NADPH và các yếu tố giới hạn.`);
    }

    // Physics - Newton's Second Law
    if (t === 'physics' && sub === 'newton2') {
        return language === 'en'
            ? mk(
                `Newton's Second Law: acceleration is directly proportional to net force and inversely proportional to mass; F = m·a.`,
                `Net force F is the vector sum of all forces. In an inertial frame, draw a force diagram, add forces by component, then apply F = m·a. Mass is constant in basic problems.`,
                `Example: Pull a 2 kg cart with 6 N on a horizontal plane (no friction) → a = 3 m/s². With 2 N friction opposing motion, net force is 4 N → a = 2 m/s². Two objects under 10 N: m1 = 2 kg → a1 = 5 m/s²; m2 = 5 kg → a2 = 2 m/s², proving a ∝ 1/m.`,
                `Common mistakes: confusing single force with net force; ignoring friction; unit errors. Always draw force diagrams and add vectors by direction.`)
            : mk(
                `Định luật II Newton: gia tốc tỉ lệ thuận với hợp lực và tỉ lệ nghịch với khối lượng; F = m·a.`,
                `Hợp lực F là tổng vectơ mọi lực. Trong hệ quán tính, vẽ sơ đồ lực, cộng lực theo phương, rồi áp F = m·a. Khối lượng coi không đổi trong bài cơ bản.`,
                `Ví dụ: Kéo xe 2 kg bằng 6 N trên mặt ngang (bỏ ma sát) → a = 3 m/s². Có ma sát 2 N ngược chiều, hợp lực 4 N → a = 2 m/s². Hai vật cùng lực 10 N: m1 = 2 kg → a1 = 5 m/s²; m2 = 5 kg → a2 = 2 m/s², chứng minh a ∝ 1/m.`,
                `Sai lầm: nhầm một lực với hợp lực; quên ma sát; lỗi đơn vị. Luôn vẽ sơ đồ và cộng vectơ theo phương.`);
    }

    // Machine Learning / AI
    if (t === 'cs.ml') {
        return language === 'en'
            ? mk(
                `Machine learning is a subset of AI that enables computers to learn from data without explicit programming.`,
                `The core process: provide training data (labeled examples), algorithm learns patterns by adjusting weights to minimize prediction errors, trained model makes predictions on new data. Three main types: supervised (labeled data, mapping function), unsupervised (hidden patterns, clustering), reinforcement (trial and error with rewards).`,
                `Real applications: Netflix/Amazon recommendations, email spam filters, self-driving car image recognition, medical diagnosis from X-rays. Key challenges: overfitting (memorizing vs generalizing), data quality, bias in training data.`,
                `To learn effectively: understand fundamentals (learning, model, training data), practice with simple examples like predicting exam scores from study hours, then move to hands-on coding projects.`)
            : mk(
                `Machine learning là nhánh AI cho phép máy tính học từ dữ liệu mà không cần lập trình rõ ràng.`,
                `Quy trình: cung cấp dữ liệu huấn luyện (ví dụ có nhãn), thuật toán học mẫu bằng điều chỉnh trọng số để giảm lỗi dự đoán, mô hình đã huấn luyện dự đoán dữ liệu mới. Ba loại: có giám sát (dữ liệu nhãn, hàm ánh xạ), không giám sát (mẫu ẩn, phân nhóm), củng cố (thử-sai với phần thưởng).`,
                `Ứng dụng: đề xuất Netflix/Amazon, lọc spam email, nhận diện ảnh xe tự lái, chẩn đoán y tế từ X-quang. Thách thức: overfitting (ghi nhớ vs tổng quát), chất lượng dữ liệu, bias.`,
                `Để học hiệu quả: hiểu cơ bản (học, mô hình, dữ liệu huấn luyện), thực hành ví dụ đơn giản như dự đoán điểm từ giờ học, rồi làm dự án lập trình.`);
    }

    // Chemistry
    if (t === 'chemistry') {
        return language === 'en'
            ? mk(
                `${p} is a chemical concept that involves molecular or atomic interactions.`,
                `Explain the chemical mechanism: what molecules/atoms participate, how bonds form or break, reaction conditions (temperature, pressure, catalysts), and the balanced chemical equation.`,
                `Give a concrete example with measurements: reactant quantities, observable changes (color, gas, precipitate), and products formed. Note practical applications in industry or daily life.`,
                `Key points: remember the balanced equation, conditions needed, and how to predict products. Common mistake: confusing physical and chemical changes.`)
            : mk(
                `${p} là khái niệm hóa học liên quan tới tương tác phân tử hoặc nguyên tử.`,
                `Mô tả cơ chế hóa học: phân tử/nguyên tử tham gia, cách liên kết hình thành/phá vỡ, điều kiện phản ứng (nhiệt độ, áp suất, xúc tác), và phương trình hóa học cân bằng.`,
                `Đưa ví dụ cụ thể có số đo: lượng chất phản ứng, thay đổi quan sát (màu, khí, kết tủa), sản phẩm tạo thành. Nêu ứng dụng trong công nghiệp hoặc đời sống.`,
                `Điểm chính: nhớ phương trình cân bằng, điều kiện cần, cách dự đoán sản phẩm. Sai lầm: nhầm biến đổi vật lý và hóa học.`);
    }

    // Math
    if (t.startsWith('math.')) {
        const mathType = t === 'math.calculus' ? 'calculus' : t === 'math.algebra' ? 'algebra' : 'geometry';

        if (t === 'math.algebra' && /hàm\s*số\s*bậc\s*hai|parabola|quadratic|parabol/.test(p.toLowerCase())) {
            return language === 'en'
                ? `A quadratic function is a polynomial function of degree two, expressed in the general form f(x) = ax² + bx + c, where a, b, and c are real numbers and a ≠ 0. The graph of a quadratic function is a parabola, a U-shaped curve that opens upward if a > 0 or downward if a < 0.

The vertex of the parabola is the highest or lowest point, located at x = -b/(2a). The axis of symmetry is the vertical line x = -b/(2a) that divides the parabola into two mirror halves. The y-intercept occurs at (0, c), where the parabola crosses the y-axis.

To graph a quadratic function, you can use several methods. First, find the vertex by calculating x = -b/(2a), then substitute this value into the function to find the y-coordinate. Next, identify the axis of symmetry. Then, find additional points by choosing x-values on either side of the vertex and calculating their corresponding y-values. Finally, plot these points and draw a smooth curve through them.

For example, consider f(x) = x² - 4x + 3. Here, a = 1, b = -4, and c = 3. The vertex x-coordinate is x = -(-4)/(2·1) = 4/2 = 2. Substituting x = 2 gives f(2) = 2² - 4·2 + 3 = 4 - 8 + 3 = -1, so the vertex is at (2, -1). The axis of symmetry is x = 2. The y-intercept is at (0, 3). Additional points: f(1) = 1 - 4 + 3 = 0, so (1, 0); f(3) = 9 - 12 + 3 = 0, so (3, 0). These are the x-intercepts. Plotting these points and drawing the parabola shows it opens upward with vertex at (2, -1).

The discriminant, Δ = b² - 4ac, determines the nature of the roots. If Δ > 0, there are two distinct real roots. If Δ = 0, there is one repeated real root (the vertex touches the x-axis). If Δ < 0, there are no real roots (the parabola does not intersect the x-axis).

Common mistakes include forgetting that a cannot be zero, miscalculating the vertex coordinates, or confusing the axis of symmetry with the vertex. Always verify your graph by checking key points and ensuring the parabola opens in the correct direction based on the sign of a.`
                : `Hàm số bậc hai là một hàm đa thức bậc hai, được biểu diễn dưới dạng tổng quát f(x) = ax² + bx + c, trong đó a, b, và c là các số thực và a ≠ 0. Đồ thị của hàm số bậc hai là một parabol, một đường cong hình chữ U mở lên trên nếu a > 0 hoặc mở xuống dưới nếu a < 0.

Đỉnh của parabol là điểm cao nhất hoặc thấp nhất, nằm tại x = -b/(2a). Trục đối xứng là đường thẳng đứng x = -b/(2a) chia parabol thành hai nửa đối xứng. Giao điểm với trục tung xảy ra tại (0, c), nơi parabol cắt trục y.

Để vẽ đồ thị hàm số bậc hai, bạn có thể sử dụng nhiều phương pháp. Đầu tiên, tìm đỉnh bằng cách tính x = -b/(2a), sau đó thay giá trị này vào hàm số để tìm tọa độ y. Tiếp theo, xác định trục đối xứng. Sau đó, tìm thêm các điểm bằng cách chọn các giá trị x ở hai bên đỉnh và tính các giá trị y tương ứng. Cuối cùng, vẽ các điểm này và vẽ đường cong mượt qua chúng.

Ví dụ, xét f(x) = x² - 4x + 3. Ở đây, a = 1, b = -4, và c = 3. Tọa độ x của đỉnh là x = -(-4)/(2·1) = 4/2 = 2. Thay x = 2 ta được f(2) = 2² - 4·2 + 3 = 4 - 8 + 3 = -1, vậy đỉnh là (2, -1). Trục đối xứng là x = 2. Giao điểm với trục tung là (0, 3). Các điểm khác: f(1) = 1 - 4 + 3 = 0, vậy (1, 0); f(3) = 9 - 12 + 3 = 0, vậy (3, 0). Đây là các giao điểm với trục hoành. Vẽ các điểm này và vẽ parabol cho thấy nó mở lên trên với đỉnh tại (2, -1).

Biệt thức, Δ = b² - 4ac, xác định tính chất của nghiệm. Nếu Δ > 0, có hai nghiệm thực phân biệt. Nếu Δ = 0, có một nghiệm kép (đỉnh chạm trục hoành). Nếu Δ < 0, không có nghiệm thực (parabol không cắt trục hoành).

Sai lầm thường gặp bao gồm quên rằng a không thể bằng không, tính sai tọa độ đỉnh, hoặc nhầm lẫn trục đối xứng với đỉnh. Luôn kiểm tra lại đồ thị bằng cách kiểm tra các điểm quan trọng và đảm bảo parabol mở đúng hướng dựa trên dấu của a.`;
        }

        return language === 'en'
            ? mk(
                `${p} is a ${mathType} concept that involves mathematical relationships and computations.`,
                `Explain the core formulas or theorems, geometric intuition if applicable, computational rules, and when to apply them. Provide detailed step-by-step explanations with concrete examples.`,
                `Provide a fully worked example with step-by-step solution and numerical result. Include domain checks or geometric verification. Show all calculations clearly.`,
                `Key points: understand the formula's meaning, not just memorize; practice with varied problems; check your work. Common mistake: algebraic errors or forgetting domain restrictions.`)
            : mk(
                `${p} là khái niệm ${mathType === 'calculus' ? 'giải tích' : mathType === 'algebra' ? 'đại số' : 'hình học'} liên quan tới quan hệ và tính toán toán học.`,
                `Giải thích công thức/định lý cốt lõi, trực giác hình học nếu có, quy tắc tính, và khi nào áp dụng. Cung cấp giải thích chi tiết từng bước với ví dụ cụ thể.`,
                `Đưa ví dụ giải đầy đủ từng bước có kết quả số. Kiểm tra miền xác định hoặc xác minh hình học. Hiển thị tất cả các phép tính rõ ràng.`,
                `Điểm chính: hiểu ý nghĩa công thức, không chỉ thuộc; luyện bài đa dạng; kiểm tra lại. Sai lầm: lỗi đại số hoặc quên điều kiện.`);
    }

    // Economics
    if (t === 'economics') {
        if (/cung\s*cầu|supply\s*and\s*demand|độ\s*co\s*giãn|elasticity/.test(p.toLowerCase())) {
            return language === 'en'
                ? `Supply and demand is the fundamental economic model that explains how prices and quantities of goods are determined in a market economy. The law of demand states that, all else being equal, as the price of a good increases, the quantity demanded decreases, and vice versa. The law of supply states that, all else being equal, as the price of a good increases, the quantity supplied increases.

The demand curve is a downward-sloping line showing the relationship between price and quantity demanded. The supply curve is an upward-sloping line showing the relationship between price and quantity supplied. Market equilibrium occurs where the demand and supply curves intersect, determining the equilibrium price and quantity where quantity demanded equals quantity supplied.

Price elasticity of demand measures how responsive quantity demanded is to changes in price. If elasticity is greater than one, demand is elastic, meaning consumers are very sensitive to price changes. If elasticity is less than one, demand is inelastic, meaning consumers are less sensitive to price changes. Elasticity depends on factors such as availability of substitutes, necessity of the good, and proportion of income spent on the good.

For example, consider the market for coffee. If the price of coffee increases from $2 to $3 per cup, and the quantity demanded decreases from 1000 cups to 600 cups per day, the price elasticity of demand is calculated as the percentage change in quantity divided by the percentage change in price. This equals -40% divided by 50%, which is -0.8. Since the absolute value is less than one, coffee demand is inelastic.

Changes in factors other than price cause the entire demand or supply curve to shift. An increase in consumer income shifts the demand curve to the right, increasing both equilibrium price and quantity. An increase in the cost of production shifts the supply curve to the left, increasing equilibrium price but decreasing equilibrium quantity.

Key points to remember: always distinguish between movement along a curve due to price changes versus shifts of the entire curve due to other factors. Understand that equilibrium price and quantity are determined by the intersection of supply and demand. Common mistakes include confusing shifts with movements along curves and misunderstanding how elasticity affects revenue.`
                : `Cung cầu là mô hình kinh tế cơ bản giải thích cách giá cả và số lượng hàng hóa được xác định trong nền kinh tế thị trường. Luật cầu phát biểu rằng, khi các yếu tố khác không đổi, khi giá tăng thì lượng cầu giảm, và ngược lại. Luật cung phát biểu rằng, khi các yếu tố khác không đổi, khi giá tăng thì lượng cung tăng.

Đường cầu là đường dốc xuống cho thấy mối quan hệ giữa giá và lượng cầu. Đường cung là đường dốc lên cho thấy mối quan hệ giữa giá và lượng cung. Cân bằng thị trường xảy ra tại điểm giao nhau của đường cầu và đường cung, xác định giá và lượng cân bằng nơi lượng cầu bằng lượng cung.

Độ co giãn giá của cầu đo lường mức độ phản ứng của lượng cầu đối với thay đổi giá. Nếu độ co giãn lớn hơn một, cầu co giãn, nghĩa là người tiêu dùng rất nhạy cảm với thay đổi giá. Nếu độ co giãn nhỏ hơn một, cầu không co giãn, nghĩa là người tiêu dùng ít nhạy cảm với thay đổi giá. Độ co giãn phụ thuộc vào các yếu tố như sự sẵn có của hàng hóa thay thế, tính tất yếu của hàng hóa, và tỷ lệ thu nhập chi cho hàng hóa đó.

Ví dụ, xét thị trường cà phê. Nếu giá cà phê tăng từ 20.000 đồng lên 30.000 đồng mỗi ly, và lượng cầu giảm từ 1000 ly xuống 600 ly mỗi ngày, độ co giãn giá của cầu được tính bằng phần trăm thay đổi lượng chia cho phần trăm thay đổi giá. Điều này bằng -40% chia cho 50%, tức là -0,8. Vì giá trị tuyệt đối nhỏ hơn một, cầu cà phê không co giãn.

Thay đổi các yếu tố khác ngoài giá làm toàn bộ đường cầu hoặc đường cung dịch chuyển. Tăng thu nhập người tiêu dùng làm đường cầu dịch sang phải, tăng cả giá và lượng cân bằng. Tăng chi phí sản xuất làm đường cung dịch sang trái, tăng giá cân bằng nhưng giảm lượng cân bằng.

Điểm chính cần nhớ: luôn phân biệt giữa di chuyển dọc đường cong do thay đổi giá với dịch chuyển toàn bộ đường cong do các yếu tố khác. Hiểu rằng giá và lượng cân bằng được xác định bởi điểm giao nhau của cung và cầu. Sai lầm thường gặp bao gồm nhầm lẫn giữa dịch chuyển và di chuyển dọc đường cong, và hiểu sai cách độ co giãn ảnh hưởng đến doanh thu.`;
        }

        return language === 'en'
            ? mk(
                `${p} is an economic concept that relates to how markets, prices, and resources interact.`,
                `Explain using supply and demand framework: definitions, ceteris paribus conditions, how curves shift, price elasticities, and market equilibrium. Provide detailed explanations with multiple examples.`,
                `Give a concrete example: a specific market scenario with numbers (quantities, prices), showing how changes in one factor affect others. Connect to real-world policy or business decisions. Include step-by-step analysis.`,
                `Key points: understand the relationship between price and quantity, factors that shift curves, and elasticity concepts. Common mistake: confusing movement along curve vs shift of curve.`)
            : mk(
                `${p} là khái niệm kinh tế về tương tác thị trường, giá cả và tài nguyên.`,
                `Giải thích bằng khung cung cầu: định nghĩa, điều kiện ceteris paribus, cách đường cong dịch chuyển, độ co giãn giá, và cân bằng thị trường. Cung cấp giải thích chi tiết với nhiều ví dụ.`,
                `Đưa ví dụ: tình huống thị trường cụ thể có số (số lượng, giá), chỉ ra cách thay đổi một yếu tố ảnh hưởng yếu tố khác. Liên hệ quyết định chính sách hoặc kinh doanh. Bao gồm phân tích từng bước.`,
                `Điểm chính: hiểu quan hệ giá-số lượng, yếu tố dịch chuyển đường cong, khái niệm co giãn. Sai lầm: nhầm di chuyển dọc đường cong vs dịch chuyển đường cong.`);
    }

    // Statistics
    if (t === 'statistics') {
        return language === 'en'
            ? mk(
                `${p} is a statistical concept used for analyzing data and making inferences.`,
                `Explain the statistical object, assumptions required, how estimation works, interpretation of results (not just formulas), and when to use it.`,
                `Provide a concrete example with numbers: a dataset scenario, calculation steps, and interpretation of the result. Mention diagnostic checks or validation methods.`,
                `Key points: understand what the statistic measures, assumptions matter, and always interpret in context. Common mistake: confusing correlation with causation.`)
            : mk(
                `${p} là khái niệm thống kê dùng phân tích dữ liệu và suy luận.`,
                `Giải thích đối tượng thống kê, giả thiết cần, cách ước lượng, cách hiểu kết quả (không chỉ công thức), và khi nào dùng.`,
                `Đưa ví dụ có số: tình huống dữ liệu, các bước tính, cách hiểu kết quả. Nêu kiểm tra chẩn đoán hoặc phương pháp xác thực.`,
                `Điểm chính: hiểu số liệu đo gì, giả thiết quan trọng, luôn hiểu trong ngữ cảnh. Sai lầm: nhầm tương quan với nhân quả.`);
    }

    // Other specific topics
    if (t === 'environment') {
        return language === 'en'
            ? mk(
                `${p} is an environmental issue that affects ecosystems and human society.`,
                `Explain the mechanism: what causes it, physical/chemical/biological processes involved, how we measure it, and evidence from observations or data.`,
                `Give one local example and one global example with specific impacts. Describe mitigation strategies and adaptation measures.`,
                `Key points: understand the root causes, how it's measured, and both mitigation and adaptation are needed. Common mistake: confusing weather with climate.`)
            : mk(
                `${p} là vấn đề môi trường ảnh hưởng hệ sinh thái và xã hội.`,
                `Giải thích cơ chế: nguyên nhân, quá trình vật lý/hóa/sinh liên quan, cách đo, và bằng chứng từ quan sát/dữ liệu.`,
                `Đưa một ví dụ địa phương và một toàn cầu với tác động cụ thể. Mô tả chiến lược giảm thiểu và biện pháp thích ứng.`,
                `Điểm chính: hiểu nguyên nhân gốc, cách đo, cả giảm thiểu và thích ứng đều cần. Sai lầm: nhầm thời tiết với khí hậu.`);
    }

    if (t === 'astronomy') {
        return language === 'en'
            ? mk(
                `${p} is an astronomical object or process in the universe.`,
                `Describe what it is, physical parameters (size, distance, composition, temperature), how we observe it (telescopes, spectroscopy, photometry), and what we infer from the data.`,
                `Include a historic discovery or space mission context. Explain how this object/process fits into our understanding of the cosmos.`,
                `Key points: understand observational methods, scales are vast, and we infer properties from light/radiation. Common mistake: confusing apparent and absolute brightness.`)
            : mk(
                `${p} là thiên thể hoặc quá trình trong vũ trụ.`,
                `Mô tả nó là gì, tham số vật lý (kích thước, khoảng cách, thành phần, nhiệt độ), cách quan sát (kính thiên văn, quang phổ, đo sáng), và điều ta suy luận từ dữ liệu.`,
                `Bao gồm bối cảnh khám phá lịch sử hoặc sứ mệnh không gian. Giải thích thiên thể/quá trình này phù hợp với hiểu biết về vũ trụ.`,
                `Điểm chính: hiểu phương pháp quan sát, quy mô rất lớn, ta suy luận tính chất từ ánh sáng/bức xạ. Sai lầm: nhầm độ sáng biểu kiến và tuyệt đối.`);
    }

    // THÊM MỚI: Computer Virus fallback
    if (t === 'cs.security' || /virus\s*(máy\s*tính)?|malware/.test(p)) {
        return language === 'en'
            ? mk(
                `A computer virus is malicious software that attaches itself to legitimate programs or files and spreads when executed, capable of self-replication and causing harm to systems. First discovered in the 1970s, viruses became a major threat with the rise of personal computers and the internet.`,
                `Viruses work through several stages. Initially, they enter systems via infected email attachments, USB drives, malicious downloads, or software vulnerabilities. Once executed, the virus copies its code into other executable files, documents, or boot sectors. It may hide using rootkit techniques to avoid detection by antivirus software. The payload activates under certain conditions like a specific date or action, executing harmful actions such as deleting files, corrupting data, stealing information, displaying messages, or opening backdoors for hackers. Modern viruses often combine with worms for automatic network spreading or trojans for disguised infiltration.`,
                `The WannaCry ransomware attack in May 2017 infected over 230,000 computers across 150 countries within days, exploiting a Windows SMB vulnerability. It encrypted user files and demanded $300-600 in Bitcoin ransom. Total damages exceeded $4 billion. The attack targeted hospitals, businesses, and government systems, causing massive disruptions. It spread rapidly through unpatched Windows systems, demonstrating how quickly modern malware can propagate. Microsoft released emergency patches, and security researchers found a kill-switch domain that slowed the spread.`,
                `Prevention requires multiple layers: install reputable antivirus software and keep it updated with latest virus definitions; regularly update operating systems and software to patch vulnerabilities; never open suspicious email attachments or click unknown links; backup important data regularly to external drives or cloud storage; use firewalls to block unauthorized network access; disable USB autorun to prevent automatic virus execution; scan all downloaded files before opening; use strong passwords and enable two-factor authentication. Common mistakes include relying solely on antivirus without user caution, thinking Macs or Linux are immune, trusting emails that appear legitimate but are phishing attempts, and clicking on fake security warnings. Understanding virus behavior helps protect personal and organizational data in our increasingly digital world.`)
            : mk(
                `Virus máy tính là phần mềm độc hại tự đính vào các chương trình hoặc file hợp pháp và lây lan khi được thực thi, có khả năng tự sao chép và gây hại cho hệ thống. Được phát hiện lần đầu vào những năm 1970, virus trở thành mối đe dọa lớn với sự phát triển của máy tính cá nhân và internet.`,
                `Virus hoạt động qua nhiều giai đoạn. Ban đầu, chúng xâm nhập hệ thống qua email đính kèm độc hại, USB, tải về từ nguồn không rõ, hoặc lỗ hổng phần mềm. Khi được thực thi, virus sao chép mã của nó vào các file thực thi, tài liệu, hoặc boot sector khác. Nó có thể ẩn mình bằng kỹ thuật rootkit để tránh bị phát hiện bởi phần mềm diệt virus. Phần payload kích hoạt khi đủ điều kiện như ngày cụ thể hoặc hành động nào đó, thực hiện các hành vi phá hoại như xóa file, làm hỏng dữ liệu, đánh cắp thông tin, hiển thị thông báo, hoặc mở backdoor cho hacker. Virus hiện đại thường kết hợp với worm để tự lan qua mạng hoặc trojan để ngụy trang xâm nhập.`,
                `Vụ tấn công ransomware WannaCry tháng 5/2017 đã nhiễm hơn 230.000 máy tính tại 150 quốc gia chỉ trong vài ngày, khai thác lỗ hổng Windows SMB. Nó mã hóa file người dùng và đòi 300-600 USD tiền chuộc bằng Bitcoin. Tổng thiệt hại vượt 4 tỷ USD. Cuộc tấn công nhắm vào bệnh viện, doanh nghiệp, và cơ quan chính phủ, gây gián đoạn lớn. Nó lây lan nhanh qua các hệ thống Windows chưa cập nhật, cho thấy malware hiện đại có thể lan truyền nhanh như thế nào. Microsoft phát hành bản vá khẩn cấp, và các nhà nghiên cứu bảo mật tìm ra domain kill-switch làm chậm sự lây lan.`,
                `Phòng chống cần nhiều lớp bảo vệ: cài phần mềm diệt virus uy tín và cập nhật định kỳ với bộ định nghĩa virus mới nhất; thường xuyên cập nhật hệ điều hành và phần mềm để vá lỗ hổng; không bao giờ mở file đính kèm email lạ hoặc click link không rõ nguồn gốc; sao lưu dữ liệu quan trọng thường xuyên ra ổ ngoài hoặc cloud; dùng tường lửa chặn truy cập mạng trái phép; tắt tính năng tự chạy USB để ngăn virus tự động thực thi; quét tất cả file tải về trước khi mở; dùng mật khẩu mạnh và bật xác thực hai yếu tố. Sai lầm phổ biến bao gồm chỉ dựa vào phần mềm diệt virus mà không cảnh giác, tưởng Mac hoặc Linux miễn nhiễm, tin vào email giả mạo trông hợp pháp, và click vào cảnh báo bảo mật giả. Hiểu cách virus hoạt động giúp bảo vệ dữ liệu cá nhân và tổ chức trong thế giới số ngày càng phát triển.`);
    }

    // Generic fallback - MUST be detailed like user's example structure
    // This is for topics that don't match any specific category
    const detailedFallback = language === 'en'
        ? `CRITICAL: Do NOT just repeat the template! You MUST provide ACTUAL, SPECIFIC content about "${prompt}".

PART 1 - DEFINITION & CONTEXT (80-100 words):
Define "${prompt}" precisely. Where does it occur? What field/domain? Why does it matter? Use proper terminology.

PART 2 - DETAILED MECHANISM (250-350 words - MAIN FOCUS):
Explain HOW it works with specific details:
- What are the inputs/starting conditions?
- What transformations/processes occur? (describe each step)
- What are the outputs/results?
- Under what conditions does this work?

Use concrete technical details, not generic descriptions. Explain causality and connections between steps.

PART 3 - CONCRETE EXAMPLE (100-120 words):
Give a REAL, specific example with:
- Actual numbers, measurements, or observable data
- Step-by-step walkthrough showing the concept in action
- Verifiable results or outcomes

Avoid vague examples like "imagine a scenario". Use real cases or realistic simulations.

PART 4 - LIMITATIONS & MISCONCEPTIONS (60-80 words):
- What are the boundaries/limitations of this concept?
- What common mistakes do learners make?
- Why do these misconceptions happen?
- How to avoid them?

PART 5 - SIGNIFICANCE & MEMORY TIP (40-60 words):
- Why is "${prompt}" important in practice?
- Real-world applications
- One memorable tip or mnemonic

PART 6 - APPLICATIONS & CONNECTIONS (80-100 words):
- How does it appear in daily life?
- Scientific/professional uses?
- Related concepts to study next?

Remember: Write in continuous prose. NO templates, NO placeholders. Fill with ACTUAL knowledge about "${prompt}".`
        : `QUAN TRỌNG: ĐỪNG chỉ lặp lại template! Bạn PHẢI cung cấp nội dung CỤ THỂ, THỰC TẾ về "${prompt}".

PHẦN 1 - ĐỊNH NGHĨA & BỐI CẢNH (80-100 từ):
Định nghĩa chính xác "${prompt}". Nó xuất hiện ở đâu? Lĩnh vực nào? Tại sao quan trọng? Dùng thuật ngữ chuyên ngành.

PHẦN 2 - CƠ CHẾ HOẠT ĐỘNG CHI TIẾT (250-350 từ - TRỌNG TÂM):
Giải thích CÁCH nó hoạt động với chi tiết cụ thể:
- Đầu vào/điều kiện ban đầu là gì?
- Quá trình biến đổi diễn ra như thế nào? (mô tả từng bước)
- Đầu ra/kết quả là gì?
- Hoạt động trong điều kiện nào?

Dùng chi tiết kỹ thuật cụ thể, không mô tả chung chung. Giải thích quan hệ nhân quả giữa các bước.

PHẦN 3 - VÍ DỤ CỤ THỂ (100-120 từ):
Đưa ví dụ THỰC TẾ, cụ thể với:
- Số liệu, đo lường, hoặc dữ liệu quan sát được
- Giải thích từng bước minh họa khái niệm
- Kết quả có thể xác minh

Tránh ví dụ mơ hồ như "hãy tưởng tượng". Dùng trường hợp thực hoặc mô phỏng thực tế.

PHẦN 4 - HẠN CHẾ & NHẦM LẪN (60-80 từ):
- Ranh giới/hạn chế của khái niệm này?
- Sai lầm phổ biến khi học?
- Tại sao có những hiểu lầm này?
- Cách tránh?

PHẦN 5 - Ý NGHĨA & MẸO GHI NHỚ (40-60 từ):
- Tại sao "${prompt}" quan trọng trong thực tế?
- Ứng dụng thực tế
- Một mẹo ghi nhớ dễ dàng

PHẦN 6 - ỨNG DỤNG & LIÊN HỆ (80-100 từ):
- Xuất hiện trong đời sống hàng ngày như thế nào?
- Ứng dụng khoa học/chuyên nghiệp?
- Khái niệm liên quan cần học tiếp?

Nhớ: Viết thành văn bản liền mạch. KHÔNG dùng template, KHÔNG để trống. Điền kiến thức THỰC TẾ về "${prompt}".`;

    return detailedFallback;
};

router.post('/generate', async (req, res) => {
    try {
        const { prompt, userId, studySetId, language = 'vi' } = req.body || {};
        if (!prompt || !userId) {
            const errorResponse = { error: 'Prompt và userId là bắt buộc' };
            return res.status(400).json(errorResponse);
        }

        console.log('\n========================================');
        console.log('🎯 Starting audio generation for:', prompt);
        console.log('========================================\n');

        let script = '';
        let attemptLog: string[] = [];

        try {
            const geminiKey = config.GEMINI_API_KEY;

            if (geminiKey) {
                console.log('📡 Attempt 1: Calling Gemini API...');
                attemptLog.push('Attempt 1: Gemini API');

                const instruction = getDetailedInstruction(prompt, language);
                console.log('📝 Instruction length:', instruction.length, 'chars');
                console.log('📝 Language:', language);

                const geminiResp = await fetch(
                    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                role: 'user',
                                parts: [{ text: instruction }]
                            }],
                            generationConfig: {
                                temperature: 0.8,
                                maxOutputTokens: 3000,
                                topP: 0.95,
                                topK: 40
                            },
                            safetySettings: [
                                {
                                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                                    threshold: 'BLOCK_NONE'
                                }
                            ]
                        })
                    }
                );

                if (geminiResp.ok) {
                    const g: any = await geminiResp.json();
                    const rawScript = g.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    script = rawScript.trim();

                    console.log('✅ Gemini SUCCESS');
                    console.log('   - Raw length:', rawScript.length);
                    console.log('   - After trim:', script.length);
                    console.log('   - First 200 chars:', script.substring(0, 200));
                    console.log('   - Word count:', script.split(' ').length);

                    // Validate language: Check if script contains Vietnamese characters when language='en'
                    if (language === 'en') {
                        const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;
                        const commonVietnameseWords = /\b(là|và|với|của|trong|được|cho|theo|này|đó|như|có|không|về|vì|khi|nếu|từ|đến|vào|ra|trên|dưới|ngoài|trong|giữa|bằng|bởi|bị|đã|đang|sẽ|sắp|đã|rồi|nữa|thêm|nữa|nhất|hơn|rất|quá|quá|nhiều|ít|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\b/i;

                        if (vietnameseChars.test(script) || commonVietnameseWords.test(script)) {
                            console.warn('⚠️  Gemini returned Vietnamese text for English request!');
                            console.warn('   - Detected Vietnamese characters/words in script');
                            console.warn('   - Requesting regeneration with stricter instruction...');

                            // Retry with more explicit instruction
                            const retryInstruction = `${instruction}\n\n⚠️ CRITICAL: You MUST write in English. The previous response contained Vietnamese text which is FORBIDDEN. Rewrite the entire lesson in English only.`;

                            const retryResp = await fetch(
                                `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent?key=${geminiKey}`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{
                                            role: 'user',
                                            parts: [{ text: retryInstruction }]
                                        }],
                                        generationConfig: {
                                            temperature: 0.8,
                                            maxOutputTokens: 3000,
                                            topP: 0.95,
                                            topK: 40
                                        },
                                        safetySettings: [
                                            {
                                                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                                                threshold: 'BLOCK_NONE'
                                            }
                                        ]
                                    })
                                }
                            );

                            if (retryResp.ok) {
                                const retryG: any = await retryResp.json();
                                const retryScript = retryG.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                const cleanedRetry = retryScript.trim();

                                // Check again
                                if (!vietnameseChars.test(cleanedRetry) && !commonVietnameseWords.test(cleanedRetry)) {
                                    script = cleanedRetry;
                                    console.log('✅ Retry SUCCESS - English script generated');
                                    attemptLog.push(`Gemini retry returned ${script.length} chars (English)`);
                                } else {
                                    console.warn('⚠️  Retry still returned Vietnamese text');
                                    attemptLog.push(`Gemini retry still Vietnamese`);
                                }
                            }
                        }
                    }

                    attemptLog.push(`Gemini returned ${script.length} chars`);
                } else {
                    const errTxt = await geminiResp.text().catch(() => '');
                    console.error('❌ Gemini FAILED:', geminiResp.status);
                    console.error('   Error:', errTxt.substring(0, 200));
                    attemptLog.push(`Gemini failed: ${geminiResp.status}`);
                }
            } else {
                console.log('⚠️  No Gemini API key configured');
                attemptLog.push('No Gemini key');
            }

            // Fallback to internal AI if Gemini failed or returned insufficient content
            // Only use if script is very short (< 400 chars) to avoid overriding good responses
            if (!script || script.length < 400) {
                console.log('\n📡 Attempt 2: Calling internal AI route...');
                attemptLog.push('Attempt 2: Internal AI');

                // Create a more direct instruction for internal AI
                const baseInstruction = getDetailedInstruction(prompt, language);
                const aiInstruction = `${baseInstruction}\n\n⚠️ CRITICAL: You must generate a COMPLETE, DETAILED lesson of at least 400-550 words. Do NOT provide a short summary or outline. Write the full lesson content as if teaching a student.`;

                try {
                    const aiResp = await fetch('http://localhost:3001/api/ai/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: aiInstruction,
                            studySetId: studySetId || ''
                        }),
                        signal: AbortSignal.timeout(20000) // 20s timeout
                    });

                    if (aiResp.ok) {
                        const data: any = await aiResp.json();
                        const rawScript = data.response || data.message || '';
                        const prevScript = script;
                        let newScript = rawScript.trim();

                        // Clean up common AI chat artifacts
                        newScript = newScript
                            .replace(/^(Chào|Xin chào|Hello|Hi)[^!]*!?\s*/i, '')
                            .replace(/Dựa trên nội dung tài liệu[^"]*"[^"]*"[^,]*,\s*/gi, '')
                            .replace(/Bạn muốn mình giải thích[^?]*\?[^😊]*😊/g, '')
                            .replace(/\[p\d+\]/g, '')
                            .trim();

                        // Only use if it's significantly longer than previous
                        if (newScript.length > prevScript.length + 200) {
                            script = newScript;
                            console.log('✅ Internal AI SUCCESS');
                            console.log('   - Previous script length:', prevScript.length);
                            console.log('   - New script length:', script.length);
                            console.log('   - First 200 chars:', script.substring(0, 200));
                            attemptLog.push(`Internal AI returned ${script.length} chars`);
                        } else {
                            console.warn('⚠️  Internal AI response too short or not better');
                            console.warn('   - Previous:', prevScript.length, 'chars');
                            console.warn('   - New:', newScript.length, 'chars');
                            attemptLog.push(`Internal AI returned ${newScript.length} chars (too short)`);
                        }
                    } else {
                        console.error('❌ Internal AI FAILED:', aiResp.status);
                        const errorText = await aiResp.text().catch(() => '');
                        console.error('   - Error:', errorText.substring(0, 200));
                        attemptLog.push(`Internal AI failed: ${aiResp.status}`);
                    }
                } catch (aiErr: any) {
                    console.error('❌ Internal AI EXCEPTION:', aiErr.message);
                    attemptLog.push(`Internal AI exception: ${aiErr.message}`);
                }
            }

            // Clean and validate the script
            if (script && script.length >= 300) {
                console.log('\n🧹 Cleaning script...');

                const originalLength = script.length;

                // Remove unwanted opening phrases - only for Vietnamese
                if (language !== 'en') {
                    script = script
                        .replace(/^(xin chào|chào (các )?bạn|hôm nay|cùng nhau|chúng ta (sẽ )?cùng|hãy cùng)[^.!?]*/gi, '')
                        .replace(/\blà gì\s+là gì\b/gi, 'là gì')
                        .replace(/\bchúng ta\s+chúng ta\b/gi, 'chúng ta')
                        .replace(/\s+/g, ' ')
                        .trim();
                } else {
                    // For English, only clean generic intros
                    script = script
                        .replace(/^(hello|hi|today|let's|we will|we are going to)[^.!?]*/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                }

                console.log('   - Removed intro phrases:', originalLength - script.length, 'chars');

                // Ensure minimum length by adding conclusion if needed
                // For 2-3 minutes, we need at least 400-500 words
                const words = script.split(' ');
                console.log('   - Word count:', words.length);
                console.log('   - Target: 400-500 words for 2-3 minute video');

                // Force expansion to reach 400-500 words for 2-3 minute video
                if (words.length < 400) {
                    console.log('   ⚠️  Script too short, expanding...');
                    const currentWords = words.length;
                    const needed = 400 - currentWords;

                    let expansion = '';
                    if (language === 'en') {
                        expansion = ` Let's explore this concept in more detail. When studying ${prompt}, it's important to understand not just the definition, but also the underlying mechanisms, real-world applications, and how it connects to other concepts you've learned. Practice problems help reinforce understanding, so try solving different types of exercises related to this topic. Always check your work and verify your answers. Remember that mastery comes from consistent practice and asking questions when you encounter difficulties.`;
                    } else {
                        expansion = ` Hãy cùng tìm hiểu sâu hơn về khái niệm này. Khi học về ${prompt}, điều quan trọng không chỉ là định nghĩa mà còn phải hiểu cơ chế hoạt động, ứng dụng thực tế, và cách nó liên hệ với các khái niệm khác đã học. Làm bài tập giúp củng cố hiểu biết, vì vậy hãy thử giải các dạng bài khác nhau liên quan đến chủ đề này. Luôn kiểm tra lại kết quả và xác minh đáp án. Nhớ rằng thành thạo đến từ việc luyện tập đều đặn và đặt câu hỏi khi gặp khó khăn.`;
                    }

                    // Add more detail if still short
                    const expandedWords = script.split(' ').length + expansion.split(' ').length;
                    if (expandedWords < 400) {
                        if (language === 'en') {
                            expansion += ` Additionally, consider these key points: first, always start with understanding the fundamental definition and why it matters. Second, work through examples step by step, showing all calculations. Third, identify common mistakes and learn how to avoid them. Fourth, practice with problems that vary in difficulty to build confidence. Finally, connect this concept to real-world scenarios where it applies. This comprehensive approach will help you master the topic and apply your knowledge effectively.`;
                        } else {
                            expansion += ` Ngoài ra, hãy lưu ý các điểm quan trọng sau: thứ nhất, luôn bắt đầu bằng việc hiểu định nghĩa cơ bản và tại sao nó quan trọng. Thứ hai, làm ví dụ từng bước một, hiển thị tất cả các phép tính. Thứ ba, xác định các sai lầm thường gặp và học cách tránh chúng. Thứ tư, thực hành với các bài toán có độ khó khác nhau để xây dựng sự tự tin. Cuối cùng, liên hệ khái niệm này với các tình huống thực tế nơi nó được áp dụng. Cách tiếp cận toàn diện này sẽ giúp bạn thành thạo chủ đề và áp dụng kiến thức một cách hiệu quả.`;
                        }
                    }

                    script = script + ' ' + expansion;
                    const finalWords = script.split(' ').length;
                    console.log('   - Added expansion:', expansion.length, 'chars');
                    console.log('   - Final word count:', finalWords);

                    if (finalWords < 400) {
                        console.warn('   ⚠️  Still below 400 words after expansion');
                    }
                } else if (words.length > 700) {
                    // Don't truncate - keep it long for longer videos
                    console.log('   - Script is long enough:', words.length, 'words');
                }

                script = script.normalize('NFC');
                console.log('   - Final length:', script.length, 'chars');
                console.log('   - Final word count:', script.split(' ').length);
                attemptLog.push(`Final script: ${script.length} chars, ${script.split(' ').length} words`);
            }

        } catch (e: any) {
            console.error('\n❌ EXCEPTION during script generation:', e.message);
            console.error('   Stack:', e.stack?.substring(0, 300));
            attemptLog.push(`Exception: ${e.message}`);
        }

        // Use emergency fallback only if everything failed
        // Check word count, not just character count
        const finalWords = script ? script.split(' ').length : 0;
        const shouldUseFallback = !script || finalWords < 350 || /chưa có tài liệu|không tìm thấy|không thể|lỗi/i.test(script);

        if (shouldUseFallback) {
            console.log('\n🚨 Using EMERGENCY FALLBACK');
            console.log('   - Reason: script length =', script?.length || 0, 'chars');
            console.log('   - Reason: word count =', finalWords, 'words');
            console.log('   - Language:', language);
            attemptLog.push('Using emergency fallback');
            const fallbackScript = getEmergencyFallback(prompt, language);

            // Expand fallback if it's too short
            let expandedFallback = fallbackScript;
            const fallbackWords = fallbackScript.split(' ').length;

            if (fallbackWords < 400) {
                console.log('   - Expanding fallback from', fallbackWords, 'to 400+ words');
                if (language === 'en') {
                    expandedFallback += ` To ensure you fully understand ${prompt}, let's dive deeper into its practical applications. Consider how this concept appears in everyday life, scientific research, and professional fields. When studying, create detailed notes, draw diagrams if helpful, and practice with real-world examples. Connect this knowledge to other topics you've learned to build a comprehensive understanding. Remember that learning is an active process - engage with the material, ask questions, and seek clarification when needed.`;
                } else {
                    expandedFallback += ` Để đảm bảo bạn hiểu đầy đủ về ${prompt}, hãy cùng đi sâu vào các ứng dụng thực tế của nó. Hãy xem xét cách khái niệm này xuất hiện trong đời sống hàng ngày, nghiên cứu khoa học, và các lĩnh vực chuyên nghiệp. Khi học, hãy tạo ghi chú chi tiết, vẽ sơ đồ nếu hữu ích, và thực hành với các ví dụ thực tế. Kết nối kiến thức này với các chủ đề khác đã học để xây dựng hiểu biết toàn diện. Nhớ rằng học tập là một quá trình chủ động - tương tác với tài liệu, đặt câu hỏi, và tìm kiếm sự làm rõ khi cần thiết.`;
                }
            }

            script = expandedFallback;
            console.log('   - Fallback length:', script.length, 'chars');
            console.log('   - Fallback words:', script.split(' ').length);
            console.log('   - Fallback preview:', script.substring(0, 150));
        }

        console.log('\n📊 FINAL SCRIPT STATS:');
        console.log('   - Length:', script.length, 'characters');
        console.log('   - Words:', script.split(' ').length);
        console.log('   - Attempt log:', attemptLog.join(' → '));
        console.log('   - First 250 chars:', script.substring(0, 250));

        // 2) Generate audio using Google TTS or ElevenLabs
        console.log('\n🎵 Starting TTS generation...');
        console.log('   - Language:', language);

        // If English, use ElevenLabs directly
        if (language === 'en') {
            console.log('🔐 Using ElevenLabs for English...');

            // Try multiple English voice IDs (public voices only - no custom voices)
            // Custom voices may hit limit, so we use only public voices
            const englishVoices = [
                '21m00Tcm4TlvDq8ikWAM', // Rachel - female, clear
                'AZnzlk1XvdvUeBnXmlld', // Domi - female
                'EXAVITQu4vr4xnSDxMaL', // Bella - female
                'pNInz6obpgDQGcFmaJgB', // Adam - male
                'yoZ06aMxZJJ28mfd3POQ', // Sam - male
                'ThT5KcBeYPX3keUQqHPh'  // Dorothy - female
            ];

            let lastError: any = null;
            let success = false;
            let finalVoiceId = '';
            let finalBuffer: Buffer | null = null;

            for (const voiceId of englishVoices) {
                let timeout: NodeJS.Timeout | null = null;
                try {
                    console.log(`   Trying voice ID: ${voiceId}`);
                    const controller = new AbortController();
                    timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

                    const ttsResp = await fetch(
                        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                        {
                            method: 'POST',
                            headers: {
                                'xi-api-key': config.ELEVENLABS_API_KEY || '',
                                'Content-Type': 'application/json',
                                'Accept': 'audio/mpeg'
                            },
                            body: JSON.stringify({
                                text: script,
                                model_id: 'eleven_multilingual_v2',
                                voice_settings: {
                                    stability: 0.45,
                                    similarity_boost: 0.85,
                                    style: 0.25,
                                    use_speaker_boost: true
                                },
                                output_format: 'mp3_44100_128'
                            }),
                            signal: controller.signal
                        }
                    );
                    if (timeout) clearTimeout(timeout);

                    const ct = ttsResp.headers.get('content-type') || '';
                    if (ttsResp.ok && ct.includes('audio')) {
                        try {
                            const buf = Buffer.from(await ttsResp.arrayBuffer());
                            if (buf && buf.length >= 100) {
                                finalVoiceId = voiceId;
                                finalBuffer = buf;
                                success = true;
                                console.log(`   ✅ Voice ${voiceId} SUCCESS`);
                                break;
                            } else {
                                lastError = { status: ttsResp.status, message: 'Audio buffer too small' };
                                console.warn(`   ⚠️  Voice ${voiceId} returned small buffer: ${buf.length} bytes`);
                            }
                        } catch (bufErr: any) {
                            lastError = { status: ttsResp.status, message: `Buffer error: ${bufErr.message}` };
                            console.warn(`   ⚠️  Voice ${voiceId} buffer error: ${bufErr.message}`);
                            continue;
                        }
                    } else {
                        try {
                            const errText = await ttsResp.text().catch(() => '');
                            lastError = { status: ttsResp.status, message: errText };

                            // Parse error JSON to check for quota/limit errors
                            let isQuotaError = false;
                            try {
                                const errJson = JSON.parse(errText);
                                const detail = errJson.detail || errJson.error || {};
                                const status = detail.status || detail.code || '';
                                const message = (detail.message || errText || '').toLowerCase();

                                // Only treat as quota error if status code is 401/403 AND message contains quota/limit keywords
                                if ((ttsResp.status === 401 || ttsResp.status === 403) &&
                                    (status.includes('quota_exceeded') ||
                                        status.includes('voice_limit_reached') ||
                                        message.includes('quota_exceeded') ||
                                        message.includes('exceeds your quota') ||
                                        message.includes('voice_limit_reached') ||
                                        message.includes('maximum amount of custom voices'))) {
                                    isQuotaError = true;
                                }
                            } catch (parseErr) {
                                // If can't parse JSON, check plain text only for quota messages
                                const lowerText = errText.toLowerCase();
                                if ((ttsResp.status === 401 || ttsResp.status === 403) &&
                                    (lowerText.includes('quota_exceeded') ||
                                        lowerText.includes('exceeds your quota') ||
                                        lowerText.includes('voice_limit_reached'))) {
                                    isQuotaError = true;
                                }
                            }

                            // Only skip all voices if it's a real quota/limit error
                            if (isQuotaError) {
                                console.warn(`   ⚠️  Voice ${voiceId} hit limit/quota, skipping all ElevenLabs voices`);
                                console.log('🔄 Voice limit/quota reached, falling back to Google TTS immediately...');
                                success = false;
                                break; // Exit loop immediately
                            }

                            // Otherwise, log error and continue to next voice
                            console.warn(`   ⚠️  Voice ${voiceId} failed: ${ttsResp.status} - ${errText.substring(0, 150)}`);
                            console.log(`   → Trying next voice...`);
                        } catch (textErr: any) {
                            lastError = { status: ttsResp.status, message: `Failed to read error text: ${textErr.message}` };
                            console.warn(`   ⚠️  Voice ${voiceId} failed: ${ttsResp.status} (error reading response)`);
                            console.log(`   → Trying next voice...`);
                        }
                    }
                } catch (err: any) {
                    lastError = err;
                    const errorMsg = (err?.message || String(err) || '').toLowerCase();

                    // Only treat as quota error if it's explicitly mentioned in exception
                    // Network errors, timeouts, etc. should not be treated as quota errors
                    const isQuotaError = errorMsg.includes('quota_exceeded') ||
                        errorMsg.includes('exceeds your quota') ||
                        errorMsg.includes('voice_limit_reached') ||
                        errorMsg.includes('maximum amount of custom voices');

                    if (isQuotaError) {
                        console.warn(`   ⚠️  Voice ${voiceId} hit limit/quota in exception, skipping all ElevenLabs voices`);
                        console.log('🔄 Voice limit/quota reached, falling back to Google TTS immediately...');
                        success = false;
                        // Clear timeout if it was set
                        if (timeout) {
                            try { clearTimeout(timeout); } catch { }
                        }
                        break; // Exit loop immediately
                    }

                    // For other errors (network, timeout, etc.), try next voice
                    console.warn(`   ⚠️  Voice ${voiceId} exception: ${err?.message || String(err)}`);
                    console.log(`   → Trying next voice...`);
                    // Clear timeout if it was set
                    if (timeout) {
                        try { clearTimeout(timeout); } catch { }
                    }
                    continue;
                } finally {
                    // Make sure timeout is cleared
                    if (timeout) {
                        try { clearTimeout(timeout); } catch { }
                    }
                }
            }

            if (!success || !finalBuffer) {
                // Check if we detected quota/limit error early
                const quotaDetected = lastError && (
                    JSON.stringify(lastError).includes('quota_exceeded') ||
                    JSON.stringify(lastError).includes('exceeds your quota') ||
                    JSON.stringify(lastError).includes('voice_limit_reached')
                );

                if (quotaDetected) {
                    console.log('ℹ️  ElevenLabs quota/limit reached - automatically using Google TTS');
                    console.log('   (This is normal - Google TTS will provide high-quality English voice)');
                } else {
                    console.warn('⚠️  ElevenLabs unavailable');
                    if (lastError) {
                        console.warn('   Reason:', JSON.stringify(lastError, null, 2));
                    }
                    console.log('🔄 Falling back to Google TTS for English...');
                }
                // Fall through to Google TTS fallback below
            } else {
                // ElevenLabs succeeded, return early
                const uploadDir = path.join(__dirname, '../../uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filename = `audio-elevenlabs-${Date.now()}.mp3`;
                const absPath = path.join(uploadDir, filename);

                fs.writeFileSync(absPath, finalBuffer);

                console.log('✅ ElevenLabs TTS SUCCESS');
                console.log('   - File:', absPath);
                console.log('   - Size:', finalBuffer.length, 'bytes');
                console.log('   - Voice ID:', finalVoiceId);

                const publicUrl = `http://localhost:3001/uploads/${filename}`;

                console.log('\n========================================');
                console.log('🎉 Audio generation completed!');
                console.log('   Provider: ElevenLabs');
                console.log('   Language: English');
                console.log('   Voice ID:', finalVoiceId);
                console.log('   URL:', publicUrl);
                console.log('========================================\n');

                const responseData = {
                    audioUrl: publicUrl,
                    script,
                    path: absPath,
                    provider: 'elevenlabs',
                    voice: finalVoiceId,
                    language: 'en',
                    stats: {
                        scriptLength: script.length,
                        wordCount: script.split(' ').length,
                        attempts: attemptLog
                    }
                };
                return res.json(responseData);
            }
        }

        // Vietnamese: Use Google TTS
        const gsaPath = config.GOOGLE_TTS_CREDENTIALS_PATH;
        if (gsaPath && fs.existsSync(gsaPath)) {
            try {
                console.log('🔐 Attempting Google TTS...');

                const raw = fs.readFileSync(gsaPath, 'utf8');
                const sa = JSON.parse(raw);
                const now = Math.floor(Date.now() / 1000);
                const header = { alg: 'RS256', typ: 'JWT' };
                const claim = {
                    iss: sa.client_email,
                    scope: 'https://www.googleapis.com/auth/cloud-platform',
                    aud: 'https://oauth2.googleapis.com/token',
                    exp: now + 3600,
                    iat: now
                };

                const base64url = (obj: any) =>
                    Buffer.from(JSON.stringify(obj))
                        .toString('base64')
                        .replace(/=/g, '')
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_');

                const unsigned = base64url(header) + '.' + base64url(claim);
                const sign = crypto.createSign('RSA-SHA256');
                sign.update(unsigned);
                const signature = sign
                    .sign(sa.private_key, 'base64')
                    .replace(/=/g, '')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_');
                const assertion = unsigned + '.' + signature;

                const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                        assertion
                    }).toString()
                });

                const tokenJson: any = await tokenResp.json();
                if (!tokenResp.ok) {
                    throw new Error(`Google OAuth failed: ${tokenJson.error}`);
                }

                console.log('✅ Google OAuth successful');

                // Determine language and voices
                let preferredVoices: string[];
                let languageCode: string;
                let xmlLang: string;
                let ssmlGender: string;
                let speakingRate: number;
                let prosodyPitchSt: number;

                if (language === 'en') {
                    // English voices (preferred female voices)
                    preferredVoices = [
                        'en-US-Neural2-A', // Female
                        'en-US-Neural2-C', // Female
                        'en-US-Neural2-D', // Female
                        'en-US-Neural2-E', // Female
                        'en-US-Neural2-F', // Female
                        'en-US-Neural2-G', // Female
                        'en-US-Neural2-H', // Female
                        'en-US-Neural2-I', // Female
                        'en-US-Neural2-J', // Female
                        'en-US-Wavenet-A', // Female (fallback)
                        'en-US-Wavenet-C', // Female (fallback)
                        'en-US-Wavenet-D', // Female (fallback)
                        'en-US-Wavenet-E', // Female (fallback)
                        'en-US-Wavenet-F', // Female (fallback)
                        'en-US-Standard-A', // Female (fallback)
                        'en-US-Standard-C', // Female (fallback)
                    ];
                    languageCode = 'en-US';
                    xmlLang = 'en-US';
                    ssmlGender = 'FEMALE';
                    speakingRate = 1.0;
                    prosodyPitchSt = 0.0;
                } else {
                    // Vietnamese voices
                    preferredVoices = [
                        // Ưu tiên giọng nữ tiếng Việt
                        'vi-VN-Wavenet-A', // Female
                        'vi-VN-Wavenet-D', // Female
                        // Neural2 có thể chưa khả dụng trong dự án hiện tại
                        'vi-VN-Neural2-C',
                        'vi-VN-Neural2-D',
                        'vi-VN-Neural2-A',
                        // Nam (fallback cuối nếu không còn lựa chọn)
                        'vi-VN-Wavenet-B'
                    ];
                    languageCode = 'vi-VN';
                    xmlLang = 'vi-VN';
                    ssmlGender = 'FEMALE';
                    speakingRate = 1.02;
                    prosodyPitchSt = 0.3; // semitones
                }

                // Build SSML to preserve tones and add mild prosody
                const ssml = `<speak xml:lang="${xmlLang}"><prosody rate="${speakingRate}" pitch="${prosodyPitchSt}st">${script}</prosody></speak>`;

                let googleSavedPath: string | null = null;
                let googlePublicUrl: string | null = null;
                let googleVoiceUsed: string | null = null;
                let lastError: string | null = null;

                for (const voiceName of preferredVoices) {
                    try {
                        console.log('🔈 Trying Google voice:', voiceName);
                        const resp = await fetch(
                            'https://texttospeech.googleapis.com/v1/text:synthesize',
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${tokenJson.access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    input: { ssml },
                                    voice: {
                                        languageCode: languageCode,
                                        name: voiceName,
                                        ssmlGender: ssmlGender
                                    },
                                    audioConfig: {
                                        audioEncoding: 'MP3',
                                        speakingRate: speakingRate,
                                        pitch: prosodyPitchSt,
                                        effectsProfileId: ['headphone-class-device']
                                    }
                                })
                            }
                        );
                        const json: any = await resp.json();
                        if (!resp.ok || !json.audioContent) {
                            const msg = json?.error?.message || 'No audio content';
                            throw new Error(msg);
                        }
                        const uploadDir = path.join(__dirname, '../../uploads');
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }
                        const filename = `audio-google-${Date.now()}.mp3`;
                        const absPath = path.join(uploadDir, filename);
                        const buf = Buffer.from(json.audioContent, 'base64');
                        fs.writeFileSync(absPath, buf);
                        console.log('✅ Google TTS SUCCESS with voice:', voiceName);
                        console.log('   - File:', absPath);
                        console.log('   - Size:', buf.length, 'bytes');
                        googleSavedPath = absPath;
                        googlePublicUrl = `http://localhost:3001/uploads/${filename}`;
                        googleVoiceUsed = voiceName;
                        break;
                    } catch (err: any) {
                        lastError = err?.message || String(err);
                        console.warn('   ↪︎ Voice try failed:', voiceName, '-', lastError);
                        continue;
                    }
                }

                if (!googleSavedPath) {
                    // Thử một lần cuối: không chỉ định name, yêu cầu FEMALE
                    try {
                        console.log(`🔈 Trying Google voice: languageCode only (${ssmlGender})`);
                        const resp = await fetch(
                            'https://texttospeech.googleapis.com/v1/text:synthesize',
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${tokenJson.access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    input: { ssml },
                                    voice: {
                                        languageCode: languageCode,
                                        ssmlGender: ssmlGender
                                    },
                                    audioConfig: {
                                        audioEncoding: 'MP3',
                                        speakingRate: speakingRate,
                                        pitch: prosodyPitchSt,
                                        effectsProfileId: ['headphone-class-device']
                                    }
                                })
                            }
                        );
                        const json: any = await resp.json();
                        if (resp.ok && json.audioContent) {
                            const uploadDir = path.join(__dirname, '../../uploads');
                            if (!fs.existsSync(uploadDir)) {
                                fs.mkdirSync(uploadDir, { recursive: true });
                            }
                            const filename = `audio-google-${Date.now()}.mp3`;
                            const absPath = path.join(uploadDir, filename);
                            const buf = Buffer.from(json.audioContent, 'base64');
                            fs.writeFileSync(absPath, buf);
                            console.log(`✅ Google TTS SUCCESS with languageCode-only ${ssmlGender}`);
                            googleSavedPath = absPath;
                            googlePublicUrl = `http://localhost:3001/uploads/${filename}`;
                            googleVoiceUsed = `${languageCode} (default ${ssmlGender})`;
                        }
                    } catch (err) {
                        // ignore
                    }
                }

                if (googleSavedPath && googlePublicUrl) {
                    console.log('\n========================================');
                    console.log('🎉 Audio generation completed!');
                    console.log('   Provider: Google TTS');
                    console.log('   Language:', language);
                    console.log('   Voice:', googleVoiceUsed);
                    console.log('   URL:', googlePublicUrl);
                    console.log('========================================\n');

                    return res.json({
                        audioUrl: googlePublicUrl,
                        script,
                        path: googleSavedPath,
                        provider: 'google',
                        voice: googleVoiceUsed,
                        language: language,
                        stats: {
                            scriptLength: script.length,
                            wordCount: script.split(' ').length,
                            attempts: attemptLog
                        }
                    });
                }

                throw new Error(`Google TTS failed for all preferred voices. Last error: ${lastError}`);

            } catch (gerr: any) {
                console.warn('⚠️  Google TTS failed, trying ElevenLabs...');
                console.warn('   Error:', gerr.message);
            }
        }

        // Fallback: ElevenLabs
        console.log('🔐 Attempting ElevenLabs TTS...');

        const voiceId = config.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
        const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': config.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify({
                    text: script,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.45,
                        similarity_boost: 0.85,
                        style: 0.25,
                        use_speaker_boost: true
                    },
                    output_format: 'mp3_44100_128'
                })
            }
        );

        const ct = ttsResp.headers.get('content-type') || '';
        if (!ttsResp.ok || !ct.includes('audio')) {
            const errText = await ttsResp.text().catch(() => '');
            console.error('❌ ElevenLabs FAILED:', ttsResp.status);
            console.error('   Content-Type:', ct);
            console.error('   Error:', errText.substring(0, 200));
            return res.status(500).json({
                error: 'TTS failed',
                details: errText || `Unexpected content-type: ${ct}`
            });
        }

        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `audio-${Date.now()}.mp3`;
        const absPath = path.join(uploadDir, filename);
        const buf = Buffer.from(await ttsResp.arrayBuffer());

        if (!buf || buf.length < 100) {
            console.error('❌ ElevenLabs returned empty audio');
            return res.status(500).json({ error: 'TTS returned empty audio' });
        }

        fs.writeFileSync(absPath, buf);

        console.log('✅ ElevenLabs TTS SUCCESS');
        console.log('   - File:', absPath);
        console.log('   - Size:', buf.length, 'bytes');
        console.log('   - Exists:', fs.existsSync(absPath));

        const publicUrl = `http://localhost:3001/uploads/${filename}`;

        console.log('\n========================================');
        console.log('🎉 Audio generation completed!');
        console.log('   Provider: ElevenLabs');
        console.log('   URL:', publicUrl);
        console.log('========================================\n');

        return res.json({
            audioUrl: publicUrl,
            script,
            path: absPath,
            provider: 'elevenlabs',
            stats: {
                scriptLength: script.length,
                wordCount: script.split(' ').length,
                attempts: attemptLog
            }
        });

    } catch (error: any) {
        console.error('\n❌❌❌ FATAL ERROR ❌❌❌');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================\n');

        return res.status(500).json({
            error: 'Internal error',
            details: error.message
        });
    }
});

export default router;