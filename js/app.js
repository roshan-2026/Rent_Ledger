
class RentSplitApp {
  constructor() {
    this.currentRole = null; // null until user selects role on homepage
    this.currency = '₹';
    this.currentReport = null;

    // App state: empty initial values (placeholders only)
    this.state = {
      propertyName: '',
      rooms: []
    };

    // Interactive simulator state for homepage first view
    this.simState = {
      rent: 20000,
      count: 2,
      mode: 'equal' // 'equal' or 'income'
    };

    this.init();
  }

  getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  generateUniqueId(prefix = 'id') {
    this._uidCounter = (this._uidCounter || 0) + 1;
    const rand = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${Date.now()}_${this._uidCounter}_${rand}`;
  }

  init() {
    this.setupTheme();
    this.setupCurrencyPicker();
    this.setupSimulator();
    this.setupRoleSelection();
    this.setupCalculateButton();
    this.setupExportButtons();
  }

  /* ==========================================================================
     Theme Management (Dark / Light Mode)
     ========================================================================== */
  setupTheme() {
    const savedTheme = localStorage.getItem('rentsplit_theme') || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.applyTheme(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = current === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
      });
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('rentsplit_theme', theme);
    } catch (e) {}

    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (text) text.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  /* ==========================================================================
     Currency Switcher
     ========================================================================== */
  setupCurrencyPicker() {
    const picker = document.getElementById('currency-picker');
    if (picker) {
      picker.addEventListener('change', (e) => {
        this.currency = e.target.value;
        this.updateCurrencyLabels();
        this.updateSimulator();
        if (this.currentReport) {
          this.calculate();
        }
      });
    }
  }

  updateCurrencyLabels() {
    document.querySelectorAll('.currency-label').forEach(el => {
      el.textContent = this.currency;
    });
  }

  /* ==========================================================================
     Homepage Interactive Live Simulator (First View Explainer)
     ========================================================================== */
  setupSimulator() {
    const slider = document.getElementById('sim-rent-slider');
    const rmBtns = document.querySelectorAll('.sim-btn-rm');
    const equalBtn = document.getElementById('sim-mode-equal');
    const incomeBtn = document.getElementById('sim-mode-income');

    if (slider) {
      slider.addEventListener('input', (e) => {
        this.simState.rent = parseFloat(e.target.value) || 20000;
        this.updateSimulator();
      });
    }

    rmBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        rmBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.simState.count = parseInt(e.currentTarget.dataset.count, 10) || 2;
        this.updateSimulator();
      });
    });

    if (equalBtn && incomeBtn) {
      equalBtn.addEventListener('click', () => {
        equalBtn.classList.add('active');
        incomeBtn.classList.remove('active');
        this.simState.mode = 'equal';
        this.updateSimulator();
      });

      incomeBtn.addEventListener('click', () => {
        incomeBtn.classList.add('active');
        equalBtn.classList.remove('active');
        this.simState.mode = 'income';
        this.updateSimulator();
      });
    }

    this.updateSimulator();
  }

  updateSimulator() {
    const rentVal = document.getElementById('sim-rent-val');
    const statusTag = document.getElementById('sim-status-tag');
    const list = document.getElementById('sim-persons-list');
    if (!list) return;

    if (rentVal) {
      rentVal.textContent = Calculator.formatCurrency(this.simState.rent, this.currency);
    }

    const count = this.simState.count;
    const mode = this.simState.mode;

    // Simulated incomes for sample demonstration
    const sampleIncomes = [60000, 40000, 30000, 20000].slice(0, count);
    const totalSimIncome = sampleIncomes.reduce((a, b) => a + b, 0);

    if (statusTag) {
      if (mode === 'equal') {
        statusTag.textContent = `Equal (${(100 / count).toFixed(0)}% Each)`;
      } else {
        statusTag.textContent = `Split by Income (${count} Roommates)`;
      }
    }

    list.innerHTML = '';
    for (let i = 0; i < count; i++) {
      let share = 0;
      let note = '';

      if (mode === 'equal') {
        share = Math.round(this.simState.rent / count);
        note = `Equal Share (1 ÷ ${count})`;
      } else {
        const ratio = sampleIncomes[i] / totalSimIncome;
        share = Math.round(this.simState.rent * ratio);
        note = `Salary: ${this.currency}${sampleIncomes[i].toLocaleString()} (${(ratio * 100).toFixed(0)}%)`;
      }

      const row = document.createElement('div');
      row.className = 'sim-person-row';
      row.innerHTML = `
        <div class="sim-p-name">
          <span>👤 Roommate ${i + 1}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; margin-left: 6px;">[${note}]</span>
        </div>
        <div class="sim-p-share">${Calculator.formatCurrency(share, this.currency)}</div>
      `;
      list.appendChild(row);
    }
  }

  /* ==========================================================================
     Role Selection Handling
     ========================================================================== */
  setupRoleSelection() {
    const ownerCard = document.getElementById('role-owner-card');
    const tenantCard = document.getElementById('role-tenant-card');
    const switchBtn = document.getElementById('btn-switch-role');

    ownerCard.addEventListener('click', () => {
      this.selectRole('owner');
    });

    tenantCard.addEventListener('click', () => {
      this.selectRole('tenant');
    });

    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        this.currentRole = null;
        document.getElementById('role-owner-card').classList.remove('active');
        document.getElementById('role-tenant-card').classList.remove('active');
        document.getElementById('role-picker-container').style.display = 'grid';
        document.getElementById('explainer-section').style.display = 'block';
        document.getElementById('role-active-banner').style.display = 'none';
        document.getElementById('setup-form-section').style.display = 'none';
        document.getElementById('results-section').classList.remove('show');
        document.getElementById('results-section').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Upfront quick room buttons
    document.querySelectorAll('.btn-quick-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-quick-room').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const numRooms = parseInt(e.currentTarget.dataset.rooms, 10) || 1;
        this.setNumberOfRooms(numRooms);
      });
    });

    // Add room buttons
    const btnAddTop = document.getElementById('btn-add-room-top');
    const btnAddBottom = document.getElementById('btn-add-room-bottom');
    const addRoomHandler = () => {
      this.addNewRoom();
    };

    if (btnAddTop) btnAddTop.addEventListener('click', addRoomHandler);
    if (btnAddBottom) btnAddBottom.addEventListener('click', addRoomHandler);

    // Property name input
    const propInput = document.getElementById('input-property-name');
    if (propInput) {
      propInput.addEventListener('input', (e) => {
        this.state.propertyName = e.target.value;
      });
    }
  }

  selectRole(role) {
    this.currentRole = role;
    const ownerCard = document.getElementById('role-owner-card');
    const tenantCard = document.getElementById('role-tenant-card');
    const activeBanner = document.getElementById('role-active-banner');
    const activeIcon = document.getElementById('role-active-icon');
    const activeTitle = document.getElementById('role-active-title');
    const formSection = document.getElementById('setup-form-section');
    const formTitle = document.getElementById('form-header-title');

    // Hide role cards & interactive explainer to present clean booking setup
    document.getElementById('role-picker-container').style.display = 'none';
    document.getElementById('explainer-section').style.display = 'none';

    if (role === 'owner') {
      ownerCard.classList.add('active');
      tenantCard.classList.remove('active');
      activeIcon.textContent = '🏢';
      activeTitle.textContent = 'Room Provider / Owner';
      formTitle.textContent = 'Room Provider: Configure Rooms, Occupants & Bills';
    } else {
      tenantCard.classList.add('active');
      ownerCard.classList.remove('active');
      activeIcon.textContent = '🤝';
      activeTitle.textContent = 'Tenant / Room Booker';
      formTitle.textContent = 'Tenant Booking: Configure Rooms, Roommates & Bills';
    }

    activeBanner.style.display = 'flex';
    formSection.style.display = 'block';

    // Initialize with 2 rooms if empty
    if (this.state.rooms.length === 0) {
      this.setNumberOfRooms(2);
    } else {
      this.renderRooms();
    }

    // Smooth scroll directly to the booking setup system
    formSection.scrollIntoView({ behavior: 'smooth' });
  }

  /* ==========================================================================
     Rooms and Room Occupancy Logic
     ========================================================================== */
  setNumberOfRooms(targetCount) {
    const currentCount = this.state.rooms.length;
    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        this.state.rooms.push(this.createEmptyRoom(i + 1));
      }
    } else if (targetCount < currentCount) {
      this.state.rooms = this.state.rooms.slice(0, targetCount);
    }
    this.renderRooms();
  }

  createEmptyRoom(roomIndex) {
    const roomId = this.generateUniqueId(`room_r${roomIndex}`);
    return {
      id: roomId,
      name: '',
      rent: '',
      deposit: '',
      startDate: '',
      months: '',
      electricity: '',
      water: '',
      internet: '',
      otherServices: '',
      splitMode: 'equal',
      // Default: 2 persons in this room with clean empty placeholders and unique IDs
      persons: [
        { id: this.generateUniqueId(`p_r${roomIndex}_1`), name: '', income: '', amountPaid: '', paymentDate: '', paymentMethod: 'UPI', payments: [] },
        { id: this.generateUniqueId(`p_r${roomIndex}_2`), name: '', income: '', amountPaid: '', paymentDate: '', paymentMethod: 'UPI', payments: [] }
      ]
    };
  }

  addNewRoom() {
    const nextIdx = this.state.rooms.length + 1;
    this.state.rooms.push(this.createEmptyRoom(nextIdx));
    this.renderRooms();
    
    // Update active state on quick-picker if matching
    document.querySelectorAll('.btn-quick-room').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.rooms, 10) === this.state.rooms.length);
    });
  }

  renderRooms() {
    const container = document.getElementById('rooms-container');
    if (!container) return;
    container.innerHTML = '';

    this.state.rooms.forEach((room, roomIdx) => {
      const roomBox = document.createElement('div');
      roomBox.className = 'room-box';
      roomBox.id = `room-box-${room.id}`;

      roomBox.innerHTML = `
        <div class="room-box-header">
          <div class="room-box-title">
            <span>🚪</span>
            <span>Room #${roomIdx + 1} ${room.name ? `(${room.name})` : ''}</span>
          </div>
          ${this.state.rooms.length > 1 ? `
            <button type="button" class="btn-remove-room" data-room-idx="${roomIdx}" title="Remove this room">
              <span class="btn-remove-room-icon">🗑️</span>
              <span class="btn-remove-room-text">Remove Room</span>
            </button>
          ` : ''}
        </div>

        <div class="room-box-body">
          <!-- Room Occupancy Prompt: How many persons in this room? -->
          <div class="occupancy-prompt-box">
            <div class="occupancy-prompt-text">
              <h5>👥 How many persons are staying in this room?</h5>
              <p>Rent & utilities for Room #${roomIdx + 1} will be split specifically between these persons.</p>
            </div>
            <div class="occupancy-input-wrap">
              <span>Persons Count:</span>
              <input type="number" class="room-occupants-count" data-room-idx="${roomIdx}" min="1" max="10" placeholder="2" value="${room.persons.length}">
            </div>
          </div>

          <!-- Room Basic Parameters (Placeholders only, no pre-fitted values) -->
          <div class="form-grid" style="margin-bottom: 18px;">
            <div class="form-group">
              <label class="form-label">Room Identifier / Label</label>
              <input type="text" class="form-input room-name-input" data-room-idx="${roomIdx}" placeholder="e.g. Room 101 / Master Bedroom" value="${room.name}">
            </div>

            <div class="form-group">
              <label class="form-label">Monthly Room Rent</label>
              <div class="input-with-icon">
                <span class="input-icon currency-label">${this.currency}</span>
                <input type="number" class="form-input room-rent-input" data-room-idx="${roomIdx}" placeholder="e.g. 20000" value="${room.rent}" min="0">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Security Deposit (One-time)</label>
              <div class="input-with-icon">
                <span class="input-icon currency-label">${this.currency}</span>
                <input type="number" class="form-input room-deposit-input" data-room-idx="${roomIdx}" placeholder="e.g. 20000" value="${room.deposit}" min="0">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Booking / Move-in Date</label>
              <input type="date" class="form-input room-start-input" data-room-idx="${roomIdx}" value="${room.startDate}">
            </div>

            <div class="form-group">
              <label class="form-label">Stay Duration (Months)</label>
              <input type="number" class="form-input room-months-input" data-room-idx="${roomIdx}" placeholder="e.g. 3" value="${room.months}" min="1" max="120">
            </div>

            <div class="form-group">
              <label class="form-label">Calculated Stay Till Date</label>
              <input type="text" class="form-input room-end-preview" value="${Calculator.formatDate(Calculator.calculateStayTillDate(room.startDate, room.months))}" disabled>
            </div>
          </div>

          <!-- Room Utility & Service Bills (Monthly) -->
          <div style="margin-bottom: 20px;">
            <div class="utility-bills-header">
              <div class="utility-bills-tag">
                <span class="utility-tag-icon">⚡</span>
                <span class="utility-tag-text">Monthly Utility & Service Bills for Room #${roomIdx + 1}</span>
              </div>
              <span class="utility-tag-sub">Split strictly among occupants of Room #${roomIdx + 1}</span>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Electricity Bill</label>
                <div class="input-with-icon">
                  <span class="input-icon currency-label">${this.currency}</span>
                  <input type="number" class="form-input room-elect-input" data-room-idx="${roomIdx}" placeholder="e.g. 1800" value="${room.electricity}" min="0">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Water Bill</label>
                <div class="input-with-icon">
                  <span class="input-icon currency-label">${this.currency}</span>
                  <input type="number" class="form-input room-water-input" data-room-idx="${roomIdx}" placeholder="e.g. 600" value="${room.water}" min="0">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Internet / Wi-Fi</label>
                <div class="input-with-icon">
                  <span class="input-icon currency-label">${this.currency}</span>
                  <input type="number" class="form-input room-internet-input" data-room-idx="${roomIdx}" placeholder="e.g. 1000" value="${room.internet}" min="0">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Other Services / Cleaning</label>
                <div class="input-with-icon">
                  <span class="input-icon currency-label">${this.currency}</span>
                  <input type="number" class="form-input room-other-input" data-room-idx="${roomIdx}" placeholder="e.g. 800" value="${room.otherServices}" min="0">
                </div>
              </div>
            </div>
          </div>

          <!-- Split Mode Selector for this room -->
          <div style="margin-bottom: 18px;">
            <label class="form-label">Split Mode for Room #${roomIdx + 1}</label>
            <div class="split-mode-selector">
              <label class="split-pill ${room.splitMode === 'equal' ? 'active' : ''}">
                <input type="radio" name="split_mode_${room.id}" value="equal" ${room.splitMode === 'equal' ? 'checked' : ''} data-room-idx="${roomIdx}">
                <div class="split-pill-text">
                  <strong>Equal Split (1 ÷ N)</strong>
                  <span>Divide rent & utilities equally among the ${room.persons.length} persons</span>
                </div>
              </label>

              <label class="split-pill ${room.splitMode === 'income' ? 'active' : ''}">
                <input type="radio" name="split_mode_${room.id}" value="income" ${room.splitMode === 'income' ? 'checked' : ''} data-room-idx="${roomIdx}">
                <div class="split-pill-text">
                  <strong>Split by Income Percentage</strong>
                  <span>Divide proportionally based on each person's monthly salary</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Persons staying in this specific room -->
          <div class="roommates-subgrid">
            <div class="subgrid-header-bar">
              <span class="subgrid-title-text">👤 Persons Staying in Room #${roomIdx + 1}</span>
              <span class="subgrid-occupants-count">(${room.persons.length} Occupant${room.persons.length > 1 ? 's' : ''})</span>
            </div>
            <div class="room-occupants-list" id="room-occupants-${room.id}">
              <!-- Render individual person inputs for this room -->
            </div>
            <button type="button" class="btn-add-person btn-add-occupant" data-room-idx="${roomIdx}">
              <span>+</span> Add Another Person
            </button>
          </div>
        </div>
      `;

      container.appendChild(roomBox);
      this.renderPersonsForRoom(room, roomIdx);
    });

    this.bindRoomEvents();
    this.updateCurrencyLabels();
  }

  renderPersonsForRoom(room, roomIdx) {
    const container = document.getElementById(`room-occupants-${room.id}`);
    if (!container) return;
    container.innerHTML = '';

    room.persons.forEach((person, pIdx) => {
      const row = document.createElement('div');
      row.className = 'roommate-row';
      row.innerHTML = `
        <div class="roommate-card-top">
          <span class="occupant-badge">Person #${pIdx + 1}</span>
        </div>

        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-size:0.8rem; font-weight:700;">Person #${pIdx + 1} Name</label>
          <input type="text" class="form-input person-name-input" data-room-idx="${roomIdx}" data-p-idx="${pIdx}" placeholder="e.g. Person ${pIdx + 1} Name" value="${person.name}">
        </div>

        <div class="form-group" style="margin:0;">
          <label class="form-label" style="font-size:0.8rem; font-weight:700;">
            Monthly Salary / Income ${room.splitMode === 'income' ? '<span style="color:var(--primary); font-weight:700;">(Used for Split)</span>' : '<span style="color:var(--text-muted); font-weight:500;">(Optional)</span>'}
          </label>
          <div class="input-with-icon">
            <span class="input-icon currency-label">${this.currency}</span>
            <input type="number" class="form-input person-income-input" data-room-idx="${roomIdx}" data-p-idx="${pIdx}" placeholder="e.g. 50000" value="${person.income}" min="0">
          </div>
        </div>

        ${room.persons.length > 1 ? `
          <button type="button" class="btn-icon-del btn-del-occupant" title="Remove Person #${pIdx + 1}" data-room-idx="${roomIdx}" data-p-idx="${pIdx}">
            <span class="del-icon">🗑️</span>
            <span class="btn-del-text">Remove Person</span>
          </button>
        ` : `<div></div>`}
      `;
      container.appendChild(row);
    });

    // Bind person inputs
    container.querySelectorAll('.person-name-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const { roomIdx, pIdx } = e.target.dataset;
        this.state.rooms[roomIdx].persons[pIdx].name = e.target.value;
      });
    });

    container.querySelectorAll('.person-income-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const { roomIdx, pIdx } = e.target.dataset;
        this.state.rooms[roomIdx].persons[pIdx].income = e.target.value;
      });
    });

    container.querySelectorAll('.btn-del-occupant').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const { roomIdx, pIdx } = e.currentTarget.dataset;
        this.state.rooms[roomIdx].persons.splice(pIdx, 1);
        this.renderRooms();
      });
    });
  }

  bindRoomEvents() {
    // Delete room button
    document.querySelectorAll('.btn-remove-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rIdx = parseInt(e.currentTarget.dataset.roomIdx, 10);
        this.state.rooms.splice(rIdx, 1);
        this.renderRooms();
      });
    });

    // "How many persons in this room?" count input
    document.querySelectorAll('.room-occupants-count').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const rIdx = parseInt(e.target.dataset.roomIdx, 10);
        const count = Math.max(1, parseInt(e.target.value, 10) || 1);
        const room = this.state.rooms[rIdx];
        
        while (room.persons.length < count) {
          room.persons.push({
            id: this.generateUniqueId(`p_r${rIdx + 1}_${room.persons.length + 1}`),
            name: '',
            income: '',
            amountPaid: '',
            paymentDate: '',
            paymentMethod: 'UPI',
            payments: []
          });
        }
        while (room.persons.length > count) {
          room.persons.pop();
        }
        this.renderRooms();
      });
    });

    // Add occupant button
    document.querySelectorAll('.btn-add-occupant').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rIdx = parseInt(e.currentTarget.dataset.roomIdx, 10);
        const room = this.state.rooms[rIdx];
        room.persons.push({
          id: this.generateUniqueId(`p_r${rIdx + 1}_${room.persons.length + 1}`),
          name: '',
          income: '',
          amountPaid: '',
          paymentDate: '',
          paymentMethod: 'UPI',
          payments: []
        });
        this.renderRooms();
      });
    });

    // Room parameters
    document.querySelectorAll('.room-name-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].name = e.target.value;
      });
    });

    document.querySelectorAll('.room-rent-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].rent = e.target.value;
      });
    });

    document.querySelectorAll('.room-deposit-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].deposit = e.target.value;
      });
    });

    document.querySelectorAll('.room-start-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const rIdx = e.target.dataset.roomIdx;
        this.state.rooms[rIdx].startDate = e.target.value;
        const end = Calculator.calculateStayTillDate(e.target.value, this.state.rooms[rIdx].months || 1);
        const preview = e.target.closest('.room-box-body').querySelector('.room-end-preview');
        if (preview) preview.value = Calculator.formatDate(end);
      });
    });

    document.querySelectorAll('.room-months-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const rIdx = e.target.dataset.roomIdx;
        this.state.rooms[rIdx].months = e.target.value;
        const end = Calculator.calculateStayTillDate(this.state.rooms[rIdx].startDate, e.target.value || 1);
        const preview = e.target.closest('.room-box-body').querySelector('.room-end-preview');
        if (preview) preview.value = Calculator.formatDate(end);
      });
    });

    // Utilities
    document.querySelectorAll('.room-elect-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].electricity = e.target.value;
      });
    });

    document.querySelectorAll('.room-water-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].water = e.target.value;
      });
    });

    document.querySelectorAll('.room-internet-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].internet = e.target.value;
      });
    });

    document.querySelectorAll('.room-other-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        this.state.rooms[e.target.dataset.roomIdx].otherServices = e.target.value;
      });
    });

    // Split mode radio
    document.querySelectorAll('input[name^="split_mode_"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const rIdx = e.target.dataset.roomIdx;
        this.state.rooms[rIdx].splitMode = e.target.value;
        this.renderRooms();
      });
    });
  }

  /* ==========================================================================
     Calculate & Results (Displayed ONLY when Calculate button is clicked)
     ========================================================================== */
  setupCalculateButton() {
    const btn = document.getElementById('btn-calculate');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.calculate();
      const resultsSec = document.getElementById('results-section');
      if (resultsSec) {
        resultsSec.style.display = 'block';
        resultsSec.classList.add('show');
        resultsSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  calculate() {
    if (this.state.rooms.length === 0) {
      alert('Please add at least one room before calculating!');
      return;
    }

    const report = Calculator.computeOwnerBreakdown({
      rooms: this.state.rooms,
      currency: this.currency
    });
    report.propertyName = this.state.propertyName || (this.currentRole === 'owner' ? 'Rental Property' : 'Shared Booking');

    this.currentReport = report;
    this.renderResults(report);

    // Pre-render the standalone invoice into the isolated document container
    Exporter.renderStandaloneInvoiceHTML(report, 'standalone-invoice-document');
  }

  renderResults(report) {
    const curr = report.currency;

    // Stat cards
    document.getElementById('stat-total-rent').textContent = Calculator.formatCurrency(report.overallTotalRent, curr);
    document.getElementById('stat-total-deposit').textContent = Calculator.formatCurrency(report.overallTotalDeposit, curr);
    document.getElementById('stat-total-utilities').textContent = Calculator.formatCurrency(report.overallTotalUtilities, curr);
    document.getElementById('stat-grand-total').textContent = Calculator.formatCurrency(report.overallGrandTotal, curr);

    // Stay Meta Box
    const samplePerson = report.allPersons[0] || {};
    const startDateFormatted = Calculator.formatDate(samplePerson.startDate);
    const endDateFormatted = Calculator.formatDate(samplePerson.endDate);
    const months = samplePerson.months || 1;

    document.getElementById('meta-start-to-end').textContent = `${startDateFormatted} ➔ ${endDateFormatted}`;
    document.getElementById('meta-months-count').textContent = `${months} Month${months > 1 ? 's' : ''}`;
    document.getElementById('meta-people-count').textContent = report.allPersons.length;

    const hasIncomeSplit = this.state.rooms.some(r => r.splitMode === 'income');
    document.getElementById('meta-split-name').textContent = hasIncomeSplit ? 'Mixed (Equal & Income-based)' : 'Equal Split per Room';

    // Render Person Breakdown Cards
    const grid = document.getElementById('persons-breakdown-grid');
    grid.innerHTML = '';

    report.allPersons.forEach((person) => {
      const card = document.createElement('div');
      card.className = 'person-card';
      card.id = `person-card-${person.id}`;

      const avatarInitial = person.name ? person.name.trim().charAt(0).toUpperCase() : 'P';
      const statusClass = person.status;
      const statusText = person.status === 'paid' ? 'PAID' : (person.status === 'partial' ? 'PARTIAL' : 'UNPAID');

      card.innerHTML = `
        <div class="person-card-header">
          <div class="person-title-area">
            <div class="person-avatar">${avatarInitial}</div>
            <div class="person-meta-side">
              <div class="person-name">${person.name || 'Unnamed Person'}</div>
              <div class="person-room-tag">📍 ${person.roomName}</div>
            </div>
          </div>
          <div>
            ${person.splitMode === 'income' ? `
              <span class="person-badge-split income-badge">
                Income: ${curr}${person.income ? person.income.toLocaleString() : 0} (${person.incomePercentage})
              </span>
            ` : `
              <span class="person-badge-split">Equal Share</span>
            `}
          </div>
        </div>

        <!-- Row-wise Itemized Service Cost Table -->
        <table class="itemized-table">
          <tbody>
            <tr>
              <td class="item-label">
                <span>🏠 Room Rent Share</span>
                <span class="item-note">${curr}${person.rentShareMonthly.toLocaleString()}/mo × ${person.months} mo</span>
              </td>
              <td>${Calculator.formatCurrency(person.rentShareTotal, curr)}</td>
            </tr>

            ${person.depositShare > 0 ? `
              <tr>
                <td class="item-label">
                  <span>🔒 Security Deposit</span>
                  <span class="item-note">One-time share</span>
                </td>
                <td>${Calculator.formatCurrency(person.depositShare, curr)}</td>
              </tr>
            ` : ''}

            <tr>
              <td class="item-label">
                <span>⚡ Electricity Share</span>
                <span class="item-note">${person.months} mo in ${person.roomName}</span>
              </td>
              <td>${Calculator.formatCurrency(person.electricityShare, curr)}</td>
            </tr>

            <tr>
              <td class="item-label">
                <span>💧 Water Bill Share</span>
                <span class="item-note">${person.months} mo in ${person.roomName}</span>
              </td>
              <td>${Calculator.formatCurrency(person.waterShare, curr)}</td>
            </tr>

            ${person.internetShare > 0 ? `
              <tr>
                <td class="item-label">
                  <span>📶 Internet / Wi-Fi Share</span>
                  <span class="item-note">${person.months} mo in ${person.roomName}</span>
                </td>
                <td>${Calculator.formatCurrency(person.internetShare, curr)}</td>
              </tr>
            ` : ''}

            ${person.otherServicesShare > 0 ? `
              <tr>
                <td class="item-label">
                  <span>🧹 Other Services / Maid</span>
                  <span class="item-note">${person.months} mo in ${person.roomName}</span>
                </td>
                <td>${Calculator.formatCurrency(person.otherServicesShare, curr)}</td>
              </tr>
            ` : ''}

            <tr class="row-total">
              <td>Total Amount Due</td>
              <td id="person-total-due-${person.id}">${Calculator.formatCurrency(person.totalDue, curr)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Interactive Payment Tracking & Transaction Ledger Box -->
        <div class="payment-box">
          <div class="payment-box-title">
            <span>💳 Payment Tracking & History</span>
            <span class="status-pill ${statusClass}" id="badge-status-${person.id}">${statusText}</span>
          </div>

          <!-- Transaction Statements List -->
          <div class="payment-history-wrap">
            <div class="payment-history-title">
              <span>Payment Statements (<span id="tx-count-${person.id}">${(person.payments || []).length}</span>)</span>
              <span style="font-weight:700; color:var(--success);" id="total-paid-display-${person.id}">
                Paid: ${Calculator.formatCurrency(person.amountPaid, curr)}
              </span>
            </div>
            <div class="payment-tx-list" id="tx-list-${person.id}">
              ${this.renderTransactionListHTML(person, curr)}
            </div>
          </div>

          <!-- Add Payment Transaction Entry Form -->
          <div style="margin-top: 6px;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-main); margin-bottom:4px;">
              + Record Payment / Installment:
            </div>
            <div class="add-tx-row">
              <input type="number" class="payment-input-sm tx-amt-input" id="tx-amt-${person.id}" 
                placeholder="${person.balance <= 0 ? 'Fully Cleared ✓' : `Amount (Max: ${Calculator.formatCurrency(person.balance, curr)})`}" 
                min="0.01" max="${person.balance}" step="any" ${person.balance <= 0 ? 'disabled' : ''}>
              <input type="date" class="payment-input-sm tx-date-input" id="tx-date-${person.id}" value="${this.getTodayDateString()}">
              <select class="payment-input-sm tx-method-select" id="tx-method-${person.id}">
                <option value="UPI">UPI / GPay</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
              <button type="button" class="btn-add-tx btn-record-tx" data-person-id="${person.id}" 
                ${person.balance <= 0 ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
                ${person.balance <= 0 ? 'Paid in Full ✓' : '+ Record'}
              </button>
            </div>
          </div>

          <!-- Remaining Balance Row -->
          <div class="balance-status-row" style="margin-top:8px;">
            <span style="color:var(--text-muted); font-size:0.78rem;">Remaining Balance:</span>
            <span class="balance-text ${person.balance > 0 ? 'has-balance' : 'cleared'}" id="balance-text-${person.id}">
              ${Calculator.formatCurrency(person.balance, curr)}
            </span>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    this.bindPaymentTrackerEvents();
  }

  renderTransactionListHTML(person, curr) {
    const payments = Array.isArray(person.payments) ? person.payments : [];
    if (payments.length === 0) {
      return `<div class="payment-tx-empty">No payments recorded yet. Record an entry below.</div>`;
    }

    return payments.map(tx => `
      <div class="payment-tx-item" id="tx-item-${tx.id}">
        <div class="payment-tx-left">
          <span class="payment-tx-amount">${Calculator.formatCurrency(tx.amount, curr)}</span>
          <span class="payment-tx-meta">• ${Calculator.formatDate(tx.date)} (${tx.method || 'UPI'})</span>
        </div>
        <button type="button" class="btn-del-tx" data-person-id="${person.id}" data-tx-id="${tx.id}" title="Delete Transaction">×</button>
      </div>
    `).join('');
  }

  bindPaymentTrackerEvents() {
    // Live validation feedback on amount inputs to guide user on maximum remaining balance
    document.querySelectorAll('.tx-amt-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const maxVal = parseFloat(e.target.max);
        if (!isNaN(val) && !isNaN(maxVal) && val > maxVal) {
          e.target.style.borderColor = 'var(--danger)';
          e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
        } else {
          e.target.style.borderColor = '';
          e.target.style.boxShadow = '';
        }
      });
    });

    // Record payment button click
    document.querySelectorAll('.btn-record-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const personId = e.currentTarget.dataset.personId;
        const row = e.currentTarget.closest('.add-tx-row');
        const card = e.currentTarget.closest('.person-card') || document;
        const amtInput = row ? row.querySelector('.tx-amt-input') : card.querySelector(`#tx-amt-${personId}`);
        const dateInput = row ? row.querySelector('.tx-date-input') : card.querySelector(`#tx-date-${personId}`);
        const methodSelect = row ? row.querySelector('.tx-method-select') : card.querySelector(`#tx-method-${personId}`);

        if (!this.currentReport) {
          alert('Please calculate the bill before recording payments!');
          return;
        }

        const person = this.currentReport.allPersons.find(p => p.id === personId);
        if (!person) {
          alert('Unable to locate occupant record. Please recalculate the bill.');
          return;
        }

        const amount = parseFloat(amtInput ? amtInput.value : 0);
        if (isNaN(amount) || amount <= 0) {
          alert('Please enter a valid positive payment amount!');
          if (amtInput) amtInput.focus();
          return;
        }

        // Real-time remaining balance validation: strictly prevent overpayment
        const currentBalance = Math.round((person.totalDue - person.amountPaid) * 100) / 100;

        if (currentBalance <= 0) {
          alert(`All dues for ${person.name} have already been fully cleared! Remaining balance is ${Calculator.formatCurrency(0, this.currency)}.`);
          if (amtInput) amtInput.value = '';
          this.refreshPersonPaymentUI(person);
          return;
        }

        if (amount > currentBalance) {
          alert(`Payment amount (${Calculator.formatCurrency(amount, this.currency)}) cannot exceed the remaining balance due of ${Calculator.formatCurrency(currentBalance, this.currency)} for ${person.name}!\n\nPlease enter an amount up to ${Calculator.formatCurrency(currentBalance, this.currency)}.`);
          if (amtInput) {
            amtInput.value = currentBalance;
            amtInput.focus();
          }
          return;
        }

        const date = dateInput && dateInput.value ? dateInput.value : this.getTodayDateString();
        const method = methodSelect ? methodSelect.value : 'UPI';

        this.addPaymentTransaction(personId, amount, date, method);
        if (amtInput) amtInput.value = '';
      });
    });

    // Delete transaction button click (delegated)
    document.querySelectorAll('.btn-del-tx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const personId = e.currentTarget.dataset.personId;
        const txId = e.currentTarget.dataset.txId;
        this.deletePaymentTransaction(personId, txId);
      });
    });
  }

  addPaymentTransaction(personId, amount, date, method) {
    if (!this.currentReport) return;
    const person = this.currentReport.allPersons.find(p => p.id === personId);
    if (!person) return;

    if (!Array.isArray(person.payments)) {
      person.payments = [];
    }

    const newTx = {
      id: this.generateUniqueId('tx'),
      amount: amount,
      date: date || this.getTodayDateString(),
      method: method || 'UPI'
    };

    person.payments.push(newTx);
    this.syncPersonPaymentsToState(personId, person.payments);
    this.refreshPersonPaymentUI(person);
  }

  deletePaymentTransaction(personId, txId) {
    if (!this.currentReport) return;
    const person = this.currentReport.allPersons.find(p => p.id === personId);
    if (!person || !Array.isArray(person.payments)) return;

    person.payments = person.payments.filter(tx => tx.id !== txId);
    this.syncPersonPaymentsToState(personId, person.payments);
    this.refreshPersonPaymentUI(person);
  }

  syncPersonPaymentsToState(personId, payments) {
    // Keep internal state in sync
    this.state.rooms.forEach(room => {
      if (Array.isArray(room.persons)) {
        const p = room.persons.find(x => x.id === personId);
        if (p) {
          p.payments = payments;
          p.amountPaid = payments.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
        }
      }
    });
  }

  refreshPersonPaymentUI(person) {
    const curr = this.currency;
    const totalPaid = (person.payments || []).reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    person.amountPaid = totalPaid;
    // Guaranteed strictly non-negative balance
    person.balance = Math.max(0, Math.round((person.totalDue - totalPaid) * 100) / 100);

    let status = 'unpaid';
    let statusText = 'UNPAID';
    if (totalPaid >= person.totalDue && person.totalDue > 0) {
      status = 'paid';
      statusText = 'PAID';
    } else if (totalPaid > 0) {
      status = 'partial';
      statusText = 'PARTIAL';
    }
    person.status = status;

    // Update status badge
    const badge = document.getElementById(`badge-status-${person.id}`);
    if (badge) {
      badge.className = `status-pill ${status}`;
      badge.textContent = statusText;
    }

    // Update balance
    const balanceText = document.getElementById(`balance-text-${person.id}`);
    if (balanceText) {
      balanceText.textContent = Calculator.formatCurrency(person.balance, curr);
      balanceText.className = `balance-text ${person.balance > 0 ? 'has-balance' : 'cleared'}`;
    }

    // Update header total paid display & count
    const paidDisplay = document.getElementById(`total-paid-display-${person.id}`);
    if (paidDisplay) {
      paidDisplay.textContent = `Paid: ${Calculator.formatCurrency(person.amountPaid, curr)}`;
    }
    const countDisplay = document.getElementById(`tx-count-${person.id}`);
    if (countDisplay) {
      countDisplay.textContent = (person.payments || []).length;
    }

    // Update transaction list
    const txList = document.getElementById(`tx-list-${person.id}`);
    if (txList) {
      txList.innerHTML = this.renderTransactionListHTML(person, curr);
      // Rebind delete events for updated list
      txList.querySelectorAll('.btn-del-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const pId = e.currentTarget.dataset.personId;
          const tId = e.currentTarget.dataset.txId;
          this.deletePaymentTransaction(pId, tId);
        });
      });
    }

    // Update payment input field and record button state based on remaining balance
    const amtInput = document.getElementById(`tx-amt-${person.id}`);
    const recordBtn = document.querySelector(`.btn-record-tx[data-person-id="${person.id}"]`);
    if (amtInput) {
      if (person.balance <= 0) {
        amtInput.value = '';
        amtInput.disabled = true;
        amtInput.placeholder = 'Fully Cleared ✓';
        amtInput.style.borderColor = '';
        amtInput.style.boxShadow = '';
        if (recordBtn) {
          recordBtn.disabled = true;
          recordBtn.textContent = 'Paid in Full ✓';
          recordBtn.style.opacity = '0.6';
          recordBtn.style.cursor = 'not-allowed';
        }
      } else {
        amtInput.disabled = false;
        amtInput.placeholder = `Amount (Max: ${Calculator.formatCurrency(person.balance, curr)})`;
        amtInput.max = person.balance;
        amtInput.style.borderColor = '';
        amtInput.style.boxShadow = '';
        if (recordBtn) {
          recordBtn.disabled = false;
          recordBtn.textContent = '+ Record';
          recordBtn.style.opacity = '';
          recordBtn.style.cursor = '';
        }
      }
    }

    // Re-render standalone invoice so PDF & Print immediately include the transactions
    Exporter.renderStandaloneInvoiceHTML(this.currentReport, 'standalone-invoice-document');
  }

  /* ==========================================================================
     Export Buttons
     ========================================================================== */
  setupExportButtons() {
    const btnPdf = document.getElementById('btn-download-pdf');
    const btnCsv = document.getElementById('btn-download-csv');
    const btnText = document.getElementById('btn-download-text');
    const btnPrint = document.getElementById('btn-print');

    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        Exporter.exportToPDF(this.currentReport, `Rent_Bill_Statement_${this.getTodayDateString()}.pdf`);
      });
    }

    if (btnCsv) {
      btnCsv.addEventListener('click', () => {
        Exporter.exportToCSV(this.currentReport);
      });
    }

    if (btnText) {
      btnText.addEventListener('click', () => {
        Exporter.exportToText(this.currentReport);
      });
    }

    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        Exporter.printBill(this.currentReport);
      });
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new RentSplitApp();
});
