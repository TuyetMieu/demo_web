        let currentDrag = null;
        document.querySelectorAll('.logic-card').forEach(card => {
            card.addEventListener('dragstart', () => { currentDrag = card; card.style.opacity = '0.4'; card.style.transform = 'scale(0.9)'; });
            card.addEventListener('dragend',   () => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; });
        });
        document.querySelectorAll('.drop-target').forEach(zone => {
            zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('hovering'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('hovering'));
            zone.addEventListener('drop', () => {
                zone.classList.remove('hovering');
                zone.classList.add('filled');
                const val     = currentDrag.innerText;
                const codeVal = currentDrag.getAttribute('data-val');
                zone.innerHTML = `<div class="logic-card ${currentDrag.classList.contains('block-blue') ? 'block-blue' : 'block-orange'} !m-0 !shadow-none !border-none !py-1 !px-4 text-sm">${val}</div>`;
                if (zone.id === 'zone-cond') {
                    const t = document.getElementById('code-cond');
                    t.innerText = codeVal;
                    t.classList.remove('text-white/20');
                    t.classList.add('text-orange-400', 'bg-orange-500/10');
                }
                if (zone.id === 'zone-act') {
                    const t = document.getElementById('code-act');
                    t.innerText = codeVal;
                    t.classList.remove('text-white/20');
                    t.classList.add('text-yellow-400', 'bg-yellow-500/10');
                }
            });
        });

        async function runMission() {
            const cond   = document.getElementById('code-cond').innerText;
            const act    = document.getElementById('code-act').innerText;
            const output = document.getElementById('output-text');
            const hint   = document.getElementById('hint-box');

            if (cond === '________' || act === '________') {
                output.innerHTML = "<span class='text-yellow-400'>> [Hệ thống] Bạn chưa lấp đầy các ô trống kìa!</span>";
                return;
            }
            try {
                const res  = await fetch('/api/mission/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mission_id: 'java', condition: cond, action: act }),
                });
                const data = await res.json();
                if (data.success) {
                    output.innerHTML = "<span class='text-green-400 font-bold'>> [OK] age=20 >= 18. Quyền truy cập được cấp! ✅ ACCESS GRANTED</span>";
                    document.getElementById('gems-count').innerText = data.gems.toLocaleString('vi-VN');
                    activateStreakBadge(data.streak);
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#F57C00', '#4A9EE0', '#27C93F'] });
                    setTimeout(() => document.getElementById('success-modal').classList.remove('hidden'), 1000);
                } else {
                    output.innerHTML = `<span class='text-red-400'>> [LỖI] ${data.message}</span>`;
                    hint.innerText = "Gợi ý: age=20 — nên cho vào nếu age >= 18!";
                    hint.classList.replace('text-white/30', 'text-red-400');
                }
            } catch {
                output.innerHTML = "<span class='text-red-400'>> [Lỗi mạng] Không thể kết nối server!</span>";
            }
        }

        function closeModal() { document.getElementById('success-modal').classList.add('hidden'); }

        function activateStreakBadge(newStreak) {
            var badge  = document.getElementById('streak-badge');
            var fire   = document.getElementById('streak-fire');
            var count  = document.getElementById('streak-count');
            var status = document.getElementById('streak-status');
            if (!badge) return;
            badge.classList.remove('streak-badge-off');
            badge.classList.add('streak-badge-on');
            fire.classList.remove('text-gray-300', 'streak-fire-off');
            fire.classList.add('text-orange-500', 'streak-fire-on');
            count.className = 'font-extrabold text-sm text-orange-600';
            count.textContent = newStreak + ' ngày';
            status.className = 'text-xs text-orange-400';
            status.textContent = 'Đang duy trì! 🔥';
        }
