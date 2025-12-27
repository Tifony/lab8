document.addEventListener('DOMContentLoaded', () => {

    // --- Data & Config ---
    const sessionTimes = ['10:40', '13:10', '15:40', '18:10', '20:35', '23:00'];
    const PRICES = {
        vip: 1350
    };

    // VIP Layout Implementation (12-Column Grid)
    // To ensure vertical alignment with centering, EVERY row must be exactly 12 units (seats+gaps) wide.

    // Row 1-5: 6 Seats. 
    // Position: Start Index 4. 
    // Formula: 4 Left Gaps + 6 Seats + 2 Right Gaps = 12 Units.

    // Row 6: 8 Seats.
    // Position: Start Index 2.
    // Formula: 2 Left Gaps + 8 Seats + 2 Right Gaps = 12 Units.

    // Row 7: 12 Seats.
    // Position: Start Index 0.
    // Formula: 0 Gaps + 12 Seats = 12 Units.

    // Aligns:
    // R5 End (Index 9) == R6 End (Index 9) == R7 Seat 10 (Index 9).

    // 0 = Gap (44px)
    // 1 = Seat

    // Rows 1-5
    const row0 = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0];
    // Row 6
    const row1 = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
    // Row 7
    const row2 = Array(12).fill(1);

    const layoutConfig = [
        { row: 1, seats: row0 },
        { row: 2, seats: row0 },
        { row: 3, seats: row0 },
        { row: 4, seats: row0 }, // Occupied logic in init
        { row: 5, seats: row0 },
        { row: 6, seats: row1 },
        { row: 7, seats: row2 }  // Occupied logic in init
    ];

    // State
    let selectedSeats = new Set();
    const gridEl = document.getElementById('seats-grid');
    const dateEl = document.getElementById('session-date');
    const timeEl = document.getElementById('session-time');
    const selectedListEl = document.getElementById('selected-seats-list');
    const selectedPanel = document.getElementById('selected-panel');
    const btnContinue = document.getElementById('btn-continue');
    const btnBuyAll = document.getElementById('btn-buy-all');

    const gapModal = document.getElementById('gap-modal');
    const btnCloseGap = document.getElementById('btn-close-gap');

    const buyAllModal = document.getElementById('buy-all-modal');
    const btnConfirmBuyAll = document.getElementById('btn-confirm-buy-all');
    const btnCancelBuyAll = document.getElementById('btn-cancel-buy-all');
    const btnCloseBuyAllX = document.getElementById('btn-close-buy-all-x');

    const seatTemplate = document.getElementById('seat-template');

    function initSessionInfo() {
        const now = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('ru-RU', options);
        // Random time
        const randomTime = sessionTimes[Math.floor(Math.random() * sessionTimes.length)];
        timeEl.textContent = randomTime;
    }

    function initGrid() {
        gridEl.innerHTML = '';

        layoutConfig.forEach(rowConfig => {
            const rowEl = document.createElement('div');
            rowEl.className = 'seat-row';

            // Flex row needs to be centered? CSS says so usually.
            // With fixed 12 units, it will just fill the "max-width" or be centered comfortably.

            // Left label
            const labelLeft = document.createElement('span');
            labelLeft.className = 'row-label left';
            labelLeft.textContent = rowConfig.row;
            rowEl.appendChild(labelLeft);

            let seatNum = 1;

            rowConfig.seats.forEach(type => {
                if (type === 0) {
                    // Gap
                    const gap = document.createElement('div');
                    gap.style.width = '44px'; // Matches .seat width (40px) + margins (4px)
                    // Ensure height matches to prevent collapse
                    gap.style.height = '44px';
                    gap.style.display = 'inline-block'; // or flex item

                    rowEl.appendChild(gap);
                } else {
                    const seat = document.createElement('div');
                    seat.className = 'seat';
                    seat.dataset.row = rowConfig.row;
                    seat.dataset.seat = seatNum;
                    seat.dataset.type = 'vip';
                    seat.dataset.price = PRICES.vip;

                    const uid = `${rowConfig.row}_${seatNum}`;
                    seat.id = `seat-${uid}`;

                    // Check Pre-Occupied
                    // Row 4: Seats 2, 3
                    if (rowConfig.row === 4 && (seatNum === 2 || seatNum === 3)) {
                        seat.classList.add('occupied');
                    }
                    // Row 7: Seats 5, 6, 7, 8
                    if (rowConfig.row === 7 && (seatNum >= 5 && seatNum <= 8)) {
                        seat.classList.add('occupied');
                    }

                    // SVG Background
                    const chairIcon = seatTemplate.content.cloneNode(true).querySelector('svg');
                    seat.appendChild(chairIcon);

                    // Number Overlay
                    const numSpan = document.createElement('span');
                    numSpan.className = 'seat-num';
                    numSpan.textContent = seatNum;
                    seat.appendChild(numSpan);

                    seat.addEventListener('click', () => handleSeatClick(seat));

                    rowEl.appendChild(seat);
                    seatNum++;
                }
            });

            // Right label
            const labelRight = document.createElement('span');
            labelRight.className = 'row-label right';
            labelRight.textContent = rowConfig.row;
            rowEl.appendChild(labelRight);

            gridEl.appendChild(rowEl);
        });
    }

    // --- Interaction ---
    function handleSeatClick(seat) {
        if (seat.classList.contains('occupied')) return;

        if (seat.classList.contains('selected')) {
            toggleSelection(seat, false);
        } else {
            // Validate Gap
            if (hasGapError(seat)) {
                shakeScreen();
                showGapModal();
                return;
            }
            toggleSelection(seat, true);
        }
    }

    function toggleSelection(seat, isSelected) {
        if (isSelected) {
            seat.classList.add('selected');
            selectedSeats.add(seat.id);
        } else {
            seat.classList.remove('selected');
            selectedSeats.delete(seat.id);
        }
        updateUI();
    }

    // Check for gaps logic 
    function checkLoc(r, s) {
        const el = document.getElementById(`seat-${r}_${s}`);
        if (!el) return 'wall';
        if (el.classList.contains('occupied')) return 'taken';
        if (el.classList.contains('selected')) return 'taken';
        return 'empty';
    }

    function hasGapError(targetSeat) {
        const row = targetSeat.dataset.row;
        const seatNum = parseInt(targetSeat.dataset.seat);

        // Check Left
        const L1 = checkLoc(row, seatNum - 1);
        const L2 = checkLoc(row, seatNum - 2);
        if (L1 === 'empty' && L2 === 'taken') return true;

        // Check Right
        const R1 = checkLoc(row, seatNum + 1);
        const R2 = checkLoc(row, seatNum + 2);
        if (R1 === 'empty' && R2 === 'taken') return true;

        return false;
    }

    function shakeScreen() {
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 300);
    }

    // --- Modals ---
    function showGapModal() {
        gapModal.classList.remove('hidden');
    }

    btnCloseGap.addEventListener('click', () => {
        gapModal.classList.add('hidden');
    });

    function showBuyAllModal() {
        buyAllModal.classList.remove('hidden');
    }

    function hideBuyAllModal() {
        buyAllModal.classList.add('hidden');
    }

    btnCancelBuyAll.addEventListener('click', hideBuyAllModal);
    btnCloseBuyAllX.addEventListener('click', hideBuyAllModal);
    btnConfirmBuyAll.addEventListener('click', () => {
        hideBuyAllModal();
        buyAllSeats();
    });

    // --- UI Update ---
    function updateUI() {
        selectedListEl.innerHTML = '';
        let total = 0;

        const sortedIds = Array.from(selectedSeats).sort((a, b) => {
            const [rA, sA] = a.replace('seat-', '').split('_').map(Number);
            const [rB, sB] = b.replace('seat-', '').split('_').map(Number);
            if (rA !== rB) return rA - rB;
            return sA - sB;
        });

        sortedIds.forEach(id => {
            const seat = document.getElementById(id);
            const price = parseInt(seat.dataset.price);
            total += price;

            const item = document.createElement('div');
            item.className = 'selected-item';

            item.innerHTML = `
                <div class="ticket-info">
                    <span class="ticket-seat">${seat.dataset.row} ряд, ${seat.dataset.seat} место</span>
                </div>
                <div class="ticket-type">
                    <span>VIP</span>
                </div>
                <div class="ticket-details">
                    <span class="ticket-badge">Взрослый</span>
                    <span class="ticket-price">${price} ₽</span>
                </div>
                <button class="btn-remove" onclick="removeSeat('${id}')">✕</button>
            `;
            selectedListEl.appendChild(item);
        });

        if (selectedSeats.size > 0) {
            selectedPanel.classList.remove('hidden');
            btnContinue.disabled = false;
            btnContinue.textContent = `ПРОДОЛЖИТЬ: ${total} ₽`;
        } else {
            selectedPanel.classList.add('hidden');
            btnContinue.disabled = true;
            btnContinue.textContent = `ПРОДОЛЖИТЬ`;
        }
    }

    // --- Buy All ---
    btnBuyAll.addEventListener('click', () => {
        showBuyAllModal();
    });

    function buyAllSeats() {
        const seats = gridEl.querySelectorAll('.seat:not(.occupied)');
        seats.forEach(seat => {
            if (!seat.classList.contains('selected')) {
                toggleSelection(seat, true);
            }
        });
    }

    window.removeSeat = (id) => {
        const seat = document.getElementById(id);
        if (seat) toggleSelection(seat, false);
    };

    initSessionInfo();
    initGrid();

});
