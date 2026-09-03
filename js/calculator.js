/**
 * Calculator Engine for Rent & Utility Split Manager
 * Supports Equal Split and Income-Percentage Split algorithms,
 * date computations, and itemized per-person breakdowns.
 */

const Calculator = {
  /**
   * Format currency with symbol and localized commas
   */
  formatCurrency(amount, symbol = '₹') {
    const num = Number(amount) || 0;
    return `${symbol}${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  },

  /**
   * Format a date string into readable format (e.g. "01 Sep 2026")
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Calculates the end date given a start date and number of months
   */
  calculateStayTillDate(startDateStr, months) {
    if (!startDateStr) return null;
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) return null;
    const durationMonths = parseInt(months, 10) || 1;
    
    // Add months
    const targetDate = new Date(date);
    targetDate.setMonth(targetDate.getMonth() + durationMonths);
    // Subtract 1 day for inclusive end date (e.g. 1st Jan to 31st Mar for 3 months)
    targetDate.setDate(targetDate.getDate() - 1);
    
    return targetDate.toISOString().split('T')[0];
  },

  /**
   * Calculate Equal Split for an array of items across a number of persons
   */
  calculateEqualSplit(totalAmount, count) {
    const total = parseFloat(totalAmount) || 0;
    const n = parseInt(count, 10) || 1;
    if (n <= 0) return 0;
    return Math.round((total / n) * 100) / 100;
  },

  /**
   * Calculate Income Percentage Split
   * Returns array of { personId, percentage, shareAmount }
   */
  calculateIncomeSplit(totalAmount, people) {
    const total = parseFloat(totalAmount) || 0;
    const totalIncome = people.reduce((sum, p) => sum + (parseFloat(p.income) || 0), 0);
    
    if (totalIncome <= 0) {
      // Fallback to equal split if total income is 0
      const equalShare = this.calculateEqualSplit(total, people.length);
      return people.map(p => ({
        id: p.id,
        percentage: (100 / people.length).toFixed(1),
        shareAmount: equalShare
      }));
    }

    return people.map(p => {
      const income = parseFloat(p.income) || 0;
      const ratio = income / totalIncome;
      const percentage = (ratio * 100).toFixed(2);
      const shareAmount = Math.round(total * ratio * 100) / 100;
      return {
        id: p.id,
        percentage,
        shareAmount
      };
    });
  },

  /**
   * Compute breakdown for Owner Model (Multiple Rooms)
   * @param {Object} data { rooms: [...], currency: '₹' }
   */
  computeOwnerBreakdown(data) {
    const currency = data.currency || '₹';
    const rooms = data.rooms || [];
    
    let overallTotalRent = 0;
    let overallTotalDeposit = 0;
    let overallTotalUtilities = 0;
    let overallGrandTotal = 0;
    const roomBreakdowns = [];
    const allPersons = [];

    rooms.forEach((room, roomIdx) => {
      const roomName = room.name || `Room ${roomIdx + 1}`;
      const months = parseInt(room.months, 10) || 1;
      const monthlyRent = parseFloat(room.rent) || 0;
      const totalRentForStay = monthlyRent * months;
      const deposit = parseFloat(room.deposit) || 0;
      
      // Utilities (monthly values, multiplied by duration)
      const electricity = parseFloat(room.electricity) || 0;
      const water = parseFloat(room.water) || 0;
      const internet = parseFloat(room.internet) || 0;
      const otherServices = parseFloat(room.otherServices) || 0;
      const monthlyUtilities = electricity + water + internet + otherServices;
      const totalUtilitiesForStay = monthlyUtilities * months;
      
      const roomGrandTotal = totalRentForStay + deposit + totalUtilitiesForStay;

      overallTotalRent += totalRentForStay;
      overallTotalDeposit += deposit;
      overallTotalUtilities += totalUtilitiesForStay;
      overallGrandTotal += roomGrandTotal;

      const startDate = room.startDate || new Date().toISOString().split('T')[0];
      const endDate = this.calculateStayTillDate(startDate, months);

      const persons = room.persons || [];
      const splitMode = room.splitMode || 'equal'; // 'equal' or 'income'
      const personCount = persons.length || 1;

      // Income calculation if splitMode === 'income'
      const totalRoomIncome = persons.reduce((acc, p) => acc + (parseFloat(p.income) || 0), 0);

      const personBreakdowns = persons.map((person, pIdx) => {
        const pName = person.name || `Tenant ${pIdx + 1}`;
        const pIncome = parseFloat(person.income) || 0;
        
        let ratio = 1 / personCount;
        let percentageText = `${(100 / personCount).toFixed(1)}%`;
        
        if (splitMode === 'income' && totalRoomIncome > 0) {
          ratio = pIncome / totalRoomIncome;
          percentageText = `${(ratio * 100).toFixed(1)}%`;
        }

        // Row-wise shares
        const rentShareMonthly = Math.round(monthlyRent * ratio * 100) / 100;
        const rentShareTotal = Math.round(totalRentForStay * ratio * 100) / 100;
        const depositShare = Math.round(deposit * ratio * 100) / 100;
        
        const electricityShare = Math.round(electricity * months * ratio * 100) / 100;
        const waterShare = Math.round(water * months * ratio * 100) / 100;
        const internetShare = Math.round(internet * months * ratio * 100) / 100;
        const otherServicesShare = Math.round(otherServices * months * ratio * 100) / 100;
        const utilitiesShareTotal = electricityShare + waterShare + internetShare + otherServicesShare;
        
        const totalDue = rentShareTotal + depositShare + utilitiesShareTotal;
        const payments = Array.isArray(person.payments) ? person.payments : [];
        const totalPaidFromLedger = payments.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
        const amountPaid = payments.length > 0 ? totalPaidFromLedger : (parseFloat(person.amountPaid) || 0);
        const balance = Math.max(0, Math.round((totalDue - amountPaid) * 100) / 100);

        let status = 'unpaid';
        if (amountPaid >= totalDue && totalDue > 0) {
          status = 'paid';
        } else if (amountPaid > 0) {
          status = 'partial';
        }

        const personObj = {
          id: person.id || `p_r${roomIdx + 1}_${pIdx + 1}_${Math.random().toString(36).substr(2, 7)}`,
          name: pName,
          roomName: roomName,
          income: pIncome,
          incomePercentage: percentageText,
          splitMode: splitMode,
          startDate: startDate,
          endDate: endDate,
          months: months,
          rentShareMonthly,
          rentShareTotal,
          depositShare,
          electricityShare,
          waterShare,
          internetShare,
          otherServicesShare,
          utilitiesShareTotal,
          totalDue,
          amountPaid,
          balance,
          status,
          payments,
          paymentDate: person.paymentDate || '',
          paymentMethod: person.paymentMethod || 'UPI'
        };

        allPersons.push(personObj);
        return personObj;
      });

      roomBreakdowns.push({
        roomName,
        months,
        startDate,
        endDate,
        monthlyRent,
        totalRentForStay,
        deposit,
        electricity: electricity * months,
        water: water * months,
        internet: internet * months,
        otherServices: otherServices * months,
        totalUtilities: totalUtilitiesForStay,
        roomGrandTotal,
        splitMode,
        persons: personBreakdowns
      });
    });

    return {
      type: 'owner',
      currency,
      overallTotalRent,
      overallTotalDeposit,
      overallTotalUtilities,
      overallGrandTotal,
      roomBreakdowns,
      allPersons
    };
  },

  /**
   * Compute breakdown for Tenant Model (Shared Room / Flat with Roommates)
   * @param {Object} data { flatName, rent, deposit, months, startDate, utilities, roommates, splitMode, currency }
   */
  computeTenantBreakdown(data) {
    const currency = data.currency || '₹';
    const flatName = data.flatName || 'Shared Flat/Room';
    const months = parseInt(data.months, 10) || 1;
    const monthlyRent = parseFloat(data.rent) || 0;
    const totalRentForStay = monthlyRent * months;
    const deposit = parseFloat(data.deposit) || 0;

    const electricity = parseFloat(data.electricity) || 0;
    const water = parseFloat(data.water) || 0;
    const internet = parseFloat(data.internet) || 0;
    const otherServices = parseFloat(data.otherServices) || 0;
    const monthlyUtilities = electricity + water + internet + otherServices;
    const totalUtilitiesForStay = monthlyUtilities * months;

    const grandTotal = totalRentForStay + deposit + totalUtilitiesForStay;

    const startDate = data.startDate || new Date().toISOString().split('T')[0];
    const endDate = this.calculateStayTillDate(startDate, months);

    const roommates = data.roommates || [];
    const splitMode = data.splitMode || 'equal';
    const count = roommates.length || 1;

    const totalIncome = roommates.reduce((sum, r) => sum + (parseFloat(r.income) || 0), 0);

    const personBreakdowns = roommates.map((rm, idx) => {
      const name = rm.name || `Roommate ${idx + 1}`;
      const income = parseFloat(rm.income) || 0;

      let ratio = 1 / count;
      let percentageText = `${(100 / count).toFixed(1)}%`;

      if (splitMode === 'income' && totalIncome > 0) {
        ratio = income / totalIncome;
        percentageText = `${(ratio * 100).toFixed(1)}%`;
      }

      const rentShareMonthly = Math.round(monthlyRent * ratio * 100) / 100;
      const rentShareTotal = Math.round(totalRentForStay * ratio * 100) / 100;
      const depositShare = Math.round(deposit * ratio * 100) / 100;

      const electricityShare = Math.round(electricity * months * ratio * 100) / 100;
      const waterShare = Math.round(water * months * ratio * 100) / 100;
      const internetShare = Math.round(internet * months * ratio * 100) / 100;
      const otherServicesShare = Math.round(otherServices * months * ratio * 100) / 100;
      const utilitiesShareTotal = electricityShare + waterShare + internetShare + otherServicesShare;

      const totalDue = rentShareTotal + depositShare + utilitiesShareTotal;
      const amountPaid = parseFloat(rm.amountPaid) || 0;
      const balance = Math.max(0, Math.round((totalDue - amountPaid) * 100) / 100);

      let status = 'unpaid';
      if (amountPaid >= totalDue && totalDue > 0) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partial';
      }

      return {
        id: rm.id || `rm_${idx + 1}_${Math.random().toString(36).substr(2, 7)}`,
        name: name,
        roomName: flatName,
        income: income,
        incomePercentage: percentageText,
        splitMode: splitMode,
        startDate: startDate,
        endDate: endDate,
        months: months,
        rentShareMonthly,
        rentShareTotal,
        depositShare,
        electricityShare,
        waterShare,
        internetShare,
        otherServicesShare,
        utilitiesShareTotal,
        totalDue,
        amountPaid,
        balance,
        status,
        paymentDate: rm.paymentDate || '',
        paymentMethod: rm.paymentMethod || 'UPI'
      };
    });

    return {
      type: 'tenant',
      currency,
      flatName,
      months,
      startDate,
      endDate,
      monthlyRent,
      overallTotalRent: totalRentForStay,
      overallTotalDeposit: deposit,
      overallTotalUtilities: totalUtilitiesForStay,
      overallGrandTotal: grandTotal,
      splitMode,
      allPersons: personBreakdowns
    };
  }
};

window.Calculator = Calculator;
