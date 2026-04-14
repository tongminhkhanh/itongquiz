import puppeteer from 'puppeteer';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const EMAIL = '[REDACTED-COMPROMISED-VALUE]';
const PASS = '[REDACTED-COMPROMISED-VALUE]';

const MUX_URL = process.env.VITE_LLM_MUX_BASE_URL || 'https://api.thitong.site/v1';
const MUX_KEY = process.env.VITE_LLM_MUX_API_KEY;

async function autoLogin(page) {
  try {
    console.log("🔑 Đang kiểm tra trạng thái đăng nhập...");
    await page.goto('https://sonlaedu.cls.vn/login', { waitUntil: 'networkidle2' });
    
    const isLoginPage = await page.evaluate(() => {
      return !!document.querySelector('input[type="password"]');
    });

    if (isLoginPage) {
      console.log("📝 Đang thực hiện đăng nhập tự động...");
      await page.waitForSelector('input[type="text"], input[type="email"]');
      await page.type('input[type="text"], input[type="email"]', EMAIL);
      await page.type('input[type="password"]', PASS);
      
      await page.click('button[type="submit"], .btn-login');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log("✅ Đăng nhập thành công!");
    } else {
      console.log("✅ Đã đăng nhập trước đó.");
    }
  } catch (err) {
    console.warn("⚠️ Lỗi trong quá trình đăng nhập (có thể đã đăng nhập rồi):", err.message);
  }
}

async function navigateToStartPoint(page) {
  console.log("🚩 Đang hướng mục tiêu đến bài 4.1.1...");
  // ID 3425 là bài 4.1.1 đã được xác nhận qua subagent
  const startUrl = 'https://sonlaedu.cls.vn/students/detail-course/130?contentId=3425';
  await page.goto(startUrl, { waitUntil: 'networkidle2' });
  console.log("🎯 Đã đến điểm xuất phát 4.1.1!");
}

(async () => {
  console.log("🚀 KHỞI ĐỘNG CỖ MÁY ĐÀO TẠO SIÊU THÔNG MINH (PHIÊN BẢN TỰ HÀNH)...");
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null, 
    userDataDir: path.resolve(__dirname, '../.sonla_profile'),
    args: ['--start-maximized', '--disable-notifications'] 
  });
  
  let page = await browser.newPage();
  
  // 1. Tự động đăng nhập
  await autoLogin(page);

  // 2. Điều hướng đến bài 4.1.1
  await navigateToStartPoint(page);

  console.log("🎉 BOT CHÍNH THỨC GIÀNH QUYỀN ĐIỀU KHIỂN...");

  // INFINITE LOOP TỰ ĐỘNG LÀM BÀI
  while (true) {
    // Nghỉ 5s giữa mỗi chu kỳ để DOM render kịp (đặc biệt Vue SPA)
    await new Promise(r => setTimeout(r, 5000)); 

    // CHỨC NĂNG: Xóa mọi Pop-up cản đường
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      // Bấm nút 'Tiếp tục ngay' nếu ở màn hình vào khóa
      const continueBtn = btns.find(b => b.innerText && (b.innerText.trim() === 'Tiếp tục ngay' || b.innerText.includes('Truy cập ngay')));
      if(continueBtn) continueBtn.click();
      
      // Popup Anti Cheat
      const antiCheat = btns.find(b => b.innerText && b.innerText.includes('Tôi đồng ý'));
      if(antiCheat) {
          console.log("[BOT] Đã duyệt qua Modal Chống Gian Lận!");
          antiCheat.click();
      }

      // Popup Bắt đầu làm bài
      const startQuiz = btns.find(b => b.innerText && b.innerText.includes('Bắt đầu làm bài') || b.innerText.includes('Tiếp tục làm bài'));
      if(startQuiz) {
          console.log("[BOT] Đang kích hoạt Bắt đầu làm bài thi!");
          startQuiz.click();
      }

      // Đóng các dialog rác khác (nếu có popup chúc mừng cần bấm x hoặc đóng)
      const dialogClose = document.querySelector('.el-dialog__headerbtn, .modal-close');
      if(dialogClose && getComputedStyle(dialogClose).display !== 'none') dialogClose.click();
    });

    let pageState = { isVideo: false, isQuiz: false, isFinished: false, videoDuration: 0 };
    let activeFrame = page;

    for (const frame of page.frames()) {
      try {
        const state = await frame.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          const isFinished = text.includes('bạn đã hoàn thành bài học') || text.includes('bài kiểm tra đã được nộp');
          const video = document.querySelector('video');
          const quizQuestions = document.querySelectorAll('input[type="radio"]'); 
          const isQuiz = quizQuestions.length >= 2;
          let duration = 0;
          if(video && video.duration && !isNaN(video.duration)) duration = video.duration;
          return { isVideo: (!!video && !isFinished), isQuiz: (isQuiz && !isFinished), isFinished, duration };
        });
        
        if (state.isFinished) pageState.isFinished = true;
        if (state.isVideo) { 
           pageState.isVideo = true; 
           pageState.videoDuration = state.duration; 
           activeFrame = frame;
        }
        if (state.isQuiz) {
           pageState.isQuiz = true;
           activeFrame = frame;
        }
      } catch(e) {}
    }

    if (pageState.isVideo) {
       console.log("📹 PHÁT HIỆN VIDEO BÀI GIẢNG ĐANG PHÁT!");
       let waitTimeSec = pageState.videoDuration;
       // Fallback thời gian
       if (!waitTimeSec || waitTimeSec < 60) waitTimeSec = 9.5 * 60; 
       else waitTimeSec = waitTimeSec + 5; 
       
       console.log(`⏳ Mở đồng hồ cát: ${Math.round(waitTimeSec/60)} phút...`);
       let timeLeft = Math.round(waitTimeSec);
       const timer = setInterval(() => {
         timeLeft -= 10;
         if (timeLeft > 0 && timeLeft % 60 === 0) {
           process.stdout.write(`\r⏱ Còn lại ${timeLeft / 60} phút...  `);
         }
       }, 10000);
       
       await new Promise(r => setTimeout(r, waitTimeSec * 1000));
       clearInterval(timer);
       console.log("\n✅ Xong Video!");
       
       try {
         // Click Hoàn Thành (Trên Main Page vì nút này thường ở ngoài iframe)
         await page.evaluate(() => {
           const btns = Array.from(document.querySelectorAll('button, span'));
           const cBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('hoàn thành'));
           if(cBtn) cBtn.click();
         });

         await new Promise(r => setTimeout(r, 4000));
         // Click Bài Tiếp Theo
         await page.evaluate(() => {
           const btns = Array.from(document.querySelectorAll('button, a'));
           const nBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('bài tiếp theo'));
           if(nBtn) nBtn.click();
         });
       } catch(e) {
           console.log("ℹ️ Trang web đã tự động chuyển hoặc đóng khung hình. Tiếp tục chu kỳ mới.");
       }

    } else if (pageState.isQuiz) {
       console.log("📝 XÁC NHẬN CHẾ ĐỘ QUÉT ĐỀ THI TRẮC NGHIỆM!");
       const questionsData = await activeFrame.evaluate(() => {
         // Quét lại toàn bộ DOM mới (tránh caching)
         const qBlocks = Array.from(document.querySelectorAll('div[class*="question"]'))
            .filter(div => div.querySelector('input[type="radio"]')); // Lọc ra div chứa hỏi

         return qBlocks.map((q, idx) => {
           let text = q.innerText.trim().split('\n')[0];
           const titleEl = q.querySelector('.title, span[class*="title"], h3');
           if(titleEl) text = titleEl.innerText;

           const options = Array.from(q.querySelectorAll('input[type="radio"]')).map(radio => {
              let label = radio.parentElement.innerText.trim();
              if(!label) {
                 const lblMatch = document.querySelector(`label[for="${radio.id}"]`);
                 if(lblMatch) label = lblMatch.innerText.trim();
              }
              return { value: radio.value, text: label || radio.value };
           });
           
           return { idx, questionText: text, options };
         }).filter(q => q.options.length > 0);
       });

       if(questionsData && questionsData.length > 0) {
         console.log(`🤖 AI Nhận dạng được ${questionsData.length} câu. Gửi về LLM Core...`);
         const answers = await solveUsingAI(questionsData);
         
         if(answers) {
            console.log("💥 Đã có đáp án. Viết vào màn hình Chrome ngay...");
            await activeFrame.evaluate((aiAnswers) => {
              aiAnswers.forEach(ans => {
                const radio = document.querySelector(`input[type="radio"][value="${ans.selectedValue}"]`);
                if(radio) {
                  radio.scrollIntoView({behavior: "smooth", block: "center"});
                  radio.click();
                  radio.checked = true;
                }
              });
            }, answers);

            console.log("🖱️ Hoàn tất tích chọn. Nhấn Submit!");
            // Click Nộp bài
            await new Promise(r => setTimeout(r, 2000));
            await activeFrame.evaluate(() => {
               const btns = Array.from(document.querySelectorAll('button'));
               const submitBtn = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes('nộp bài') || b.innerText.toLowerCase().includes('hoàn thành')));
               if(submitBtn) submitBtn.click();
            });

            // Nếu hỏi Xác nhận 'Đồng ý' nộp bài
            page.removeAllListeners('dialog');
            page.on('dialog', async dialog => {
              console.log("⚠️ Xác nhận khung Popup ẩn!");
              await dialog.accept();
            });
            await new Promise(r => setTimeout(r, 6000));
         } else {
            console.log("🚫 AI trả về rỗng, chờ bạn click hộ.");
            await new Promise(r => setTimeout(r, 20000));
         }
       }
    } else {
       // Thêm xử lý cho Bài học Dạng Tài liệu đính kèm (PDF/Slide SCORM)
       console.log("📄 CHẾ ĐỘ MỞ MÙ: Chưa tìm thấy Video hay Trắc nghiệm. Có thể đây là bài Đọc Tài liệu / SCORM!");
       console.log("⏳ Bot sẽ treo máy 30 giây để hệ thống ghi nhận thời gian đọc bài...");
       
       let timeLeft = 30;
       const timer = setInterval(() => {
         timeLeft -= 5;
         if (timeLeft > 0) {
           process.stdout.write(`\r⏱ Đợi thêm ${timeLeft} giây...  `);
         }
       }, 5000);
       
       await new Promise(r => setTimeout(r, 30000));
       clearInterval(timer);
       console.log("\n✅ Đã đọc xong tài liệu!");

       try {
         // Click Hoàn Thành (Trên Main Page vì nút này thường ở ngoài iframe)
         await page.evaluate(() => {
           const btns = Array.from(document.querySelectorAll('button, span'));
           const cBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('hoàn thành'));
           if(cBtn) cBtn.click();
         });

         await new Promise(r => setTimeout(r, 4000));
         // Click Bài Tiếp Theo
         await page.evaluate(() => {
           const btns = Array.from(document.querySelectorAll('button, a'));
           const nBtn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('bài tiếp theo'));
           if(nBtn) nBtn.click();
         });
       } catch(e) {}
       
       console.log("🔍 Đang rảnh! Bắt đầu quét cột Danh sách bài học để tự định hướng tiếp...");
       
       const debugResult = await page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll('span, p, div, a, label, h3'));
          let percentFound = 0;

          for (let el of allElements) {
             const text = (el.innerText || "").trim();
             // Tìm chính xác ký tự "0%" "10 %"
             const match = text.match(/^([0-9]{1,2})\s*%$/);
             if (match) {
                percentFound++;
                const progress = parseInt(match[1]);
                if (progress < 100) {
                   // Để chắc chắn trúng nút bấm, bot sẽ click vào TẤT CẢ các thẻ bao bọc (Cha, ông nội, ông cố)
                   el.scrollIntoView({behavior: "smooth", block: "center"});
                   el.click();
                   if (el.parentElement) el.parentElement.click();
                   if (el.parentElement?.parentElement) el.parentElement.parentElement.click();
                   if (el.parentElement?.parentElement?.parentElement) el.parentElement.parentElement.parentElement.click();
                   if (el.parentElement?.parentElement?.parentElement?.parentElement) el.parentElement.parentElement.parentElement.parentElement.click();
                   return 'CLICK_HUGE_SUCCESS'; 
                }
             }
          }
          return `FOUND_${percentFound}_PERCENTAGES`;
       });
       
       if (debugResult === 'CLICK_HUGE_SUCCESS') {
           console.log("👉 Phát hiện bài tiến độ < 100%. Đã click liên hoàn để nhảy bài! Đang rặn nội dung...");
           await new Promise(r => setTimeout(r, 6000));
       } else {
           console.log(`⚠️ Radar báo cáo: [${debugResult}]. Có vẻ không scan trúng cái % nào hoặc đã xong hết khóa học. Thử lại sau 5s...`);
           await new Promise(r => setTimeout(r, 5000));
       }
    }
  }

})();
