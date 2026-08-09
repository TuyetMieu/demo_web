        let currentDrag = null;
        const draggables = document.querySelectorAll('.logic-card');
        const zones = document.querySelectorAll('.drop-target');

        draggables.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                currentDrag = card;
                card.style.opacity = '0.4';
                card.style.transform = 'scale(0.9)';
            });
            card.addEventListener('dragend', () => {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        });

        zones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                zone.classList.add('hovering');
            });
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('hovering');
            });
            zone.addEventListener('drop', (e) => {
                zone.classList.remove('hovering');
                zone.classList.add('filled');
                
                const val = currentDrag.innerText;
                const codeVal = currentDrag.getAttribute('data-val');
                
                // Hiển thị khối lệnh vào ô thả
                zone.innerHTML = `<div class="logic-card ${currentDrag.classList.contains('block-blue') ? 'block-blue' : 'block-orange'} !m-0 !shadow-none !border-none !py-1 !px-4 text-sm">${val}</div>`;
                
                // Update Compiler UI
                if(zone.id === 'zone-cond') {
                    const target = document.getElementById('code-cond');
                    target.innerText = codeVal;
                    target.classList.remove('text-white/20');
                    target.classList.add('text-orange-400', 'bg-orange-500/10');
                }
                if(zone.id === 'zone-act') {
                    const target = document.getElementById('code-act');
                    target.innerText = codeVal;
                    target.classList.remove('text-white/20');
                    target.classList.add('text-brand-secondary', 'bg-blue-500/10');
                }
            });
        });

        async function runMission() {
            const cond   = document.getElementById('code-cond').innerText;
            const act    = document.getElementById('code-act').innerText;
            const output = document.getElementById('output-text');
            const hint   = document.getElementById('hint-box');

            // Kiểm tra ô trống ngay tại client để phản hồi nhanh
            if (cond === '________' || act === '________') {
                output.innerHTML = "<span class='text-yellow-400'>> [Hệ thống] Bạn chưa lấp đầy các ô trống kìa!</span>";
                return;
            }

            // Gửi đáp án lên server để xác thực và lưu tiến độ
            try {
                const res  = await fetch('/api/mission/complete', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ mission_id: 'cpp', condition: cond, action: act }),
                });
                const data = await res.json();

                if (data.success) {
                    output.innerHTML = "<span class='text-green-400 font-bold'>> [OK] Pin đang ở mức 15%. Robot đang di chuyển về trạm sạc... VROOM VROOM!</span>";
                    // Cập nhật số gems trên navbar ngay lập tức
                    document.getElementById('gems-count').innerText = data.gems.toLocaleString('vi-VN');
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#58CC02', '#1CB0F6', '#FF4B4B']
                    });
                    setTimeout(() => {
                        document.getElementById('success-modal').classList.remove('hidden');
                    }, 1000);
                } else {
                    output.innerHTML = `<span class='text-red-400'>> [LỖI] ${data.message}</span>`;
                    hint.innerText = "Gợi ý: Hãy chọn 'Pin < 20' và 'Về trạm sạc'!";
                    hint.classList.remove('text-white/30');
                    hint.classList.add('text-red-400');
                }
            } catch (err) {
                output.innerHTML = "<span class='text-red-400'>> [Lỗi mạng] Không thể kết nối server, thử lại nhé!</span>";
            }
        }

        function closeModal() {
            document.getElementById('success-modal').classList.add('hidden');
        }
