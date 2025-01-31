const apiKey = '17a9202550f9bf4b1c377bfe980c2911';

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Erro ao buscar dados');
  return response.json();
}

function translateDescription(description) {
  const translations = {
    'clear sky': 'céu limpo', 'few clouds': 'poucas nuvens', 'scattered clouds': 'nuvens dispersas',
    'broken clouds': 'nuvens quebradas', 'shower rain': 'chuva passageira', 'rain': 'chuva',
    'light rain': 'chuva leve', 'thunderstorm': 'trovoada', 'snow': 'neve', 'mist': 'névoa',
    'overcast clouds': 'nublado'
  };
  return translations[description] || description;
}

function updateUI(data) {
  ['temperature', 'weatherDescription', 'wind', 'humidity', 'cityName'].forEach(id => {
    document.getElementById(id).textContent = {
      temperature: `${Math.round(data.main.temp)}°C`,
      weatherDescription: translateDescription(data.weather[0].description),
      wind: `${data.wind.speed} km/h`,
      humidity: `${data.main.humidity}%`,
      cityName: data.name
    }[id];
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WeatherDB', 1);
    request.onupgradeneeded = (e) => e.target.result.createObjectStore('weatherData', { keyPath: 'id' });
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => reject('Erro ao abrir o banco de dados.');
  });
}

function saveData(db, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('weatherData', 'readwrite');
    const store = transaction.objectStore('weatherData');
    const request = store.put({ id: 'current', ...data });
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Erro ao salvar os dados.');
  });
}

function getData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('weatherData', 'readonly');
    const store = transaction.objectStore('weatherData');
    const request = store.get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Erro ao buscar os dados.');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!navigator.geolocation) return alert('Geolocalização não suportada.');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);

  const db = await openDB().catch(console.error);
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const { latitude, longitude } = position.coords;
      const weatherData = await fetchData(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`);
      await saveData(db, weatherData);
      updateUI(weatherData);
    } catch (error) {
      console.error('Erro ao buscar dados online. Tentando recuperar dados offline...', error);
      const offlineData = await getData(db);
      if (offlineData) updateUI(offlineData);
      else alert('Erro ao buscar dados. Verifique sua conexão.');
    }
  }, () => alert('Erro ao obter localização. Verifique as permissões.'), {
    enableHighAccuracy: true, timeout: 5000, maximumAge: 0
  });
});