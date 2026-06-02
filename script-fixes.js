/**
 * ═══════════════════════════════════════════════════════════
 * NURA — FIXES & IMPROVEMENTS v1
 * - Gráfica semanal: Lunes-Domingo (correcto)
 * - Click en barras: Mostrar datos diarios
 * - Sueño: Solo nocturno (sin siestas)
 * ═══════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════
// 1. GRÁFICA SEMANAL — CORREGIR ORDEN (LUN-DOM)
// ══════════════════════════════════════════════════════════

function getWeekStart() {
  const today = new Date();
  const day = today.getDay();
  // Ajuste para que lunes sea día 1 (0=Domingo, 1=Lunes, etc.)
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(today);
  weekStart.setDate(diff);
  return weekStart;
}

function getWeekDays() {
  const start = getWeekStart();
  const days = [];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    
    days.push({
      date: date,
      dayName: dayNames[i],
      dayIndex: i,
      dateStr: date.toISOString().split('T')[0], // YYYY-MM-DD
      dayOfMonth: date.getDate()
    });
  }
  
  return days;
}

// ══════════════════════════════════════════════════════════
// 2. RENDERIZAR GRÁFICA SEMANAL CON ORDEN CORRECTO
// ══════════════════════════════════════════════════════════

function renderWeeklyChart() {
  const weekDays = getWeekDays();
  const chartEl = document.querySelector('.week-chart');
  
  if (!chartEl) return; // Si no existe el elemento, salir
  
  const chartHTML = weekDays.map(day => {
    // Obtener datos del día (implementar según tu lógica)
    const dayData = getDataForDay(day.dateStr);
    const heightPercent = calculateBarHeight(dayData);
    
    return `<div class="week-bar-col" data-date="${day.dateStr}" data-day-index="${day.dayIndex}" data-day-name="${day.dayName}">
      <div class="week-bar-fill" style="height: ${heightPercent}%"></div>
      <span class="week-bar-label">${day.dayName}</span>
    </div>`;
  }).join('');
  
  chartEl.innerHTML = chartHTML;
  
  // Agregar listeners de click
  attachWeekChartListeners();
}

// ══════════════════════════════════════════════════════════
// 3. AGREGAR INTERACTIVIDAD — CLICK EN BARRAS
// ══════════════════════════════════════════════════════════

function attachWeekChartListeners() {
  const cols = document.querySelectorAll('.week-bar-col');
  
  cols.forEach(col => {
    col.addEventListener('click', function() {
      // Remover clase 'selected' de todas las barras
      cols.forEach(c => c.classList.remove('selected'));
      
      // Marcar esta barra como seleccionada
      this.classList.add('selected');
      
      const dateStr = this.dataset.date;
      const dayName = this.dataset.dayName;
      const dayIndex = parseInt(this.dataset.dayIndex);
      
      // Mostrar detalles del día
      displayDailyDetails(dateStr, dayName, dayIndex);
    });
  });
}

// ══════════════════════════════════════════════════════════
// 4. MOSTRAR DATOS DIARIOS AL CLICKEAR
// ══════════════════════════════════════════════════════════

function displayDailyDetails(dateStr, dayName, dayIndex) {
  const dayData = getDataForDay(dateStr);
  const date = new Date(dateStr);
  const dateFormatted = date.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Log para debugging (remover después)
  console.log(`📊 Datos del ${dayName} (${dateFormatted}):`, dayData);
  
  // Actualizar UI si existe contenedor de detalles
  const detailsContainer = document.querySelector('[data-daily-details]');
  if (detailsContainer && dayData) {
    detailsContainer.innerHTML = `
      <div style="padding: 12px; background: rgba(255,255,255,0.5); border-radius: 12px;">
        <h4 style="margin: 0 0 10px; font-size: 14px;">${dayName.toUpperCase()} — ${dateFormatted}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
          <div>🔥 Calorías: <strong>${dayData.calories || 0}</strong> kcal</div>
          <div>💪 Proteína: <strong>${dayData.protein || 0}</strong>g</div>
          <div>🥕 Carbos: <strong>${dayData.carbs || 0}</strong>g</div>
          <div>🧈 Grasa: <strong>${dayData.fat || 0}</strong>g</div>
          <div>💧 Agua: <strong>${dayData.water || 0}</strong>ml</div>
          <div>😴 Sueño: <strong>${dayData.sleepNight || 0}</strong>h</div>
        </div>
      </div>
    `;
  }
}

// ══════════════════════════════════════════════════════════
// 5. OBTENER DATOS DE UN DÍA ESPECÍFICO
// ══════════════════════════════════════════════════════════

function getDataForDay(dateStr) {
  // IMPORTANTE: Adaptar esto según tu sistema de almacenamiento
  // Actualmente retorna estructura vacía como template
  
  try {
    // Opción 1: Si usas localStorage
    const allData = JSON.parse(localStorage.getItem('nura-data') || '{}');
    if (allData[dateStr]) {
      return allData[dateStr];
    }
    
    // Opción 2: Si usas Supabase
    // (Implementar según tu configuración)
    
    // Opción 3: Por defecto, retornar estructura
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water: 0,
      sleepNight: 0 // Solo sueño nocturno (no incluye siestas)
    };
  } catch (e) {
    console.warn('Error obteniendo datos del día:', e);
    return null;
  }
}

// ══════════════════════════════════════════════════════════
// 6. CALCULAR ALTURA DE BARRA (BASADO EN CALORÍAS)
// ══════════════════════════════════════════════════════════

function calculateBarHeight(dayData) {
  if (!dayData) return 0;
  
  // Basado en calorías (puedes cambiar la métrica)
  const maxCals = 2500; // Máximo para 100%
  const percent = Math.min((dayData.calories || 0) / maxCals * 100, 100);
  
  // Garantizar mínimo visible (3px)
  return Math.max(percent, 0);
}

// ══════════════════════════════════════════════════════════
// 7. SUEÑO — DETECTAR TIPO (SIESTA vs NOCTURNO) Y FILTRAR
// ══════════════════════════════════════════════════════════

function determineSleepType(bedtime) {
  const date = new Date(bedtime);
  const hour = date.getHours();
  
  // Siesta: 12:00 - 20:00
  if (hour >= 12 && hour < 20) {
    return 'nap';
  }
  
  // Sueño nocturno: 20:00 - 12:00 (al día siguiente)
  return 'night';
}

function calculateNightSleepOnly(sleepLogs) {
  // Filtrar solo sueño nocturno, ignoring siestas
  const nightLogs = sleepLogs.filter(log => {
    // Si no tiene tipo, determinar automáticamente
    if (!log.type) {
      log.type = determineSleepType(log.bedtime);
    }
    return log.type === 'night';
  });
  
  // Sumar solo las horas de sueño nocturno
  const totalMinutes = nightLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  
  return {
    totalHours: totalHours,
    totalMinutes: totalMinutes,
    nightSessions: nightLogs.length,
    logs: nightLogs
  };
}

// ══════════════════════════════════════════════════════════
// 8. MIGRAR DATOS ANTIGUOS (AGREGAR CAMPO 'type')
// ══════════════════════════════════════════════════════════

function migrateSleepData(sleepLogs) {
  return sleepLogs.map(log => {
    if (!log.type) {
      log.type = determineSleepType(log.bedtime);
      console.log(`✅ Migrado: Sueño de ${log.bedtime} → tipo: ${log.type}`);
    }
    return log;
  });
}

// ══════════════════════════════════════════════════════════
// 9. INICIALIZAR AL CARGAR LA APP
// ══════════════════════════════════════════════════════════

function initializeChartFixes() {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderWeeklyChart();
    });
  } else {
    renderWeeklyChart();
  }
  
  // Observar cambios en la gráfica (si se redibuja)
  observeChartChanges();
}

function observeChartChanges() {
  const chartEl = document.querySelector('.week-chart');
  if (!chartEl) return;
  
  // Observer para detectar cambios en la gráfica
  const observer = new MutationObserver(() => {
    // Re-renderizar listeners cuando la gráfica cambie
    attachWeekChartListeners();
  });
  
  observer.observe(chartEl, {
    childList: true,
    subtree: true
  });
}

// ══════════════════════════════════════════════════════════
// 10. EJECUTAR AL CARGAR
// ══════════════════════════════════════════════════════════

// Inicializar cuando esté lista
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChartFixes);
} else {
  initializeChartFixes();
}

// También re-renderizar cuando cambien de tab
document.addEventListener('click', (e) => {
  // Si hace click en un tab que podría cambiar la vista
  if (e.target.closest('.tnav-item')) {
    setTimeout(() => {
      renderWeeklyChart();
    }, 100);
  }
});

// Exportar funciones para uso externo si es necesario
if (typeof window !== 'undefined') {
  window.NuraChartFixes = {
    renderWeeklyChart,
    getWeekDays,
    getDataForDay,
    displayDailyDetails,
    determineSleepType,
    calculateNightSleepOnly,
    migrateSleepData
  };
}
