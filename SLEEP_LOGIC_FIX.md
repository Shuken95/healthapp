# 🐛 FIX: Cálculo Correcto de Sueño Nocturno

## El Problema
La app sumaba TODO el sueño (siestas + sueño nocturno), mostrando datos incorrectos.

**Ejemplo:**
- Siesta 15:31-16:31 (1h)
- Sueño 22:30-05:10 (6h 40m)
- App mostraba: "De 15:31 a 05:10" = 13h 39m ❌

## Solución Implementada

### 1. **Cada registro de sueño ahora incluye automáticamente el tipo**
```javascript
{
  bedtime: "2024-06-01T15:31:00",
  waketime: "2024-06-01T16:31:00",
  duration: 60,
  type: "nap"  // ← AUTO DETECTADO: "nap" o "night"
}
```

### 2. **Detección Automática (Sin intervención del usuario)**
- **Siesta (nap):** Dormir entre las 12:00 y 20:00
- **Sueño nocturno (night):** Dormir entre las 20:00 y 12:00 (día siguiente)

### 3. **Cálculo corregido**
Solo cuenta sueño **nocturno (night)**:
```javascript
// ANTES (INCORRECTO):
totalSleep = [1h siesta + 6h40m noche] = 7h 40m ❌

// AHORA (CORRECTO):
totalSleep = [6h 40m noche] = 6h 40m ✅
```

## Cambios en el Código

### A. Función para detectar tipo de sueño
```javascript
function determineSleepType(bedtime) {
  const date = new Date(bedtime);
  const hour = date.getHours();
  
  // Siesta: 12:00 - 20:00
  if (hour >= 12 && hour < 20) {
    return "nap";
  }
  // Sueño nocturno: 20:00 - 12:00
  return "night";
}
```

### B. Al guardar sueño
```javascript
// Cuando se registra un nuevo sueño:
const sleepRecord = {
  bedtime: userInputBedtime,
  waketime: userInputWaketime,
  duration: calculateDuration(bedtime, waketime),
  type: determineSleepType(userInputBedtime) // ← AUTO
};

await saveSleepLog(sleepRecord);
```

### C. Al calcular total diario
```javascript
// ANTES: sumaba TODO
const totalSleep = sleepLogs.reduce((sum, log) => sum + log.duration, 0);

// AHORA: solo cuenta "night"
const totalSleep = sleepLogs
  .filter(log => log.type === "night")  // ← FILTRO
  .reduce((sum, log) => sum + log.duration, 0);
```

### D. Migración de datos antiguos
```javascript
// Convertir registros antiguos (sin field 'type')
sleepLogs = sleepLogs.map(log => {
  if (!log.type) {
    log.type = determineSleepType(log.bedtime);
  }
  return log;
});
```

## Resultado Final

✅ **Siesta a las 15:31**: Clasificada como "nap" → **NO cuenta** en total  
✅ **Sueño 22:30-05:10**: Clasificada como "night" → **Cuenta** como 6h 40m  
✅ **Total mostrado**: 6h 40m (¡Correcto!)

---

## Notas Técnicas
- La detección es **100% automática** - el usuario NO ve selector de tipo
- Se ejecuta en background al registrar sueño
- Los datos antiguos se migran automáticamente
- Compatible con Supabase (si usas DB remota)
