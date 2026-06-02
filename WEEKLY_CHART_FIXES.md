# 🐛 FIXES: Gráfica Semanal

## Problema 1: Los datos diarios NO se muestran al clickear en la gráfica
Cuando haces click en cada barra de la gráfica semanal, NO se actualiza con los datos de ese día.

### Causa
La gráfica probablemente NO tiene:
- Listener de click en cada barra
- Función para mostrar datos diarios del día seleccionado
- Actualización dinámica del contenido

### Solución
```javascript
// Al hacer click en cada barra, mostrar datos del día
document.querySelectorAll('.week-bar-col').forEach((col, index) => {
  col.addEventListener('click', () => {
    const dayData = getWeeklyData()[index];
    displayDailyDetails(dayData);
    col.classList.add('selected');
  });
});

// Función para mostrar detalles diarios
function displayDailyDetails(dayData) {
  const dayName = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dayData.dayIndex];
  
  // Actualizar:
  // - Calorías totales del día
  // - Macros (proteína, carbos, grasa)
  // - Agua consumida
  // - Sueño (solo nocturno)
  // - Ejercicio
  // etc.
  
  console.log(`${dayName}: ${dayData}`);
}
```

---

## Problema 2: La gráfica empieza en miércoles y acaba en martes

### Causa Probable
El código está calculando la semana CON DESPLAZAMIENTO INCORRECTO.

```javascript
// ❌ INCORRECTO - Genera semana Mié-Mar:
const today = new Date();
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - today.getDay() + 3); // ← DESPLAZAMIENTO ERRÓNEO

// ✅ CORRECTO - Genera semana Lun-Dom:
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - today.getDay() + 1);
// O mejor:
startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
```

### Referencia Rápida
- `getDay()` devuelve: 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
- Para semana Lunes-Domingo:
  - **Fórmula:** `date - getDay() + 1`
  - O si es domingo (0): `date - 6`

### Solución Completa

```javascript
function getWeekStart() {
  const today = new Date();
  const day = today.getDay();
  
  // Ajuste para que lunes sea día 1
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  
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
      data: getDataForDay(date)
    });
  }
  
  return days;
}

// Renderizar gráfica con orden correcto
function renderWeeklyChart() {
  const weekDays = getWeekDays();
  const chartHTML = weekDays.map(day => `
    <div class="week-bar-col" data-day="${day.dayIndex}">
      <div class="week-bar-fill" style="height: ${getBarHeight(day.data)}%"></div>
      <span class="week-bar-label">${day.dayName}</span>
    </div>
  `).join('');
  
  document.querySelector('.week-chart').innerHTML = chartHTML;
  attachClickListeners();
}

function attachClickListeners() {
  document.querySelectorAll('.week-bar-col').forEach(col => {
    col.addEventListener('click', function() {
      document.querySelectorAll('.week-bar-col').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      
      const dayIndex = parseInt(this.dataset.day);
      const weekDays = getWeekDays();
      displayDailyDetails(weekDays[dayIndex]);
    });
  });
}
```

---

## Resumen de Cambios Necesarios

| Problema | Solución |
|----------|----------|
| Gráfica Mié-Mar | Cambiar fórmula: `getDay() + 1` en lugar de `+ 3` |
| Click no funciona | Agregar event listener en `.week-bar-col` |
| No muestra datos | Crear función `displayDailyDetails()` |
| Orden incorrecto | Usar array de 7 días en orden Lun-Dom |

---

## Testing

Después de implementar:
1. ✅ Abrir app el lunes - verificar que empiece en lunes
2. ✅ Abrir app el sábado - verificar que termine en domingo  
3. ✅ Clickear cada barra - verificar que se ilumina y muestra datos
4. ✅ Verificar que los datos mostrados coinciden con ese día específico
