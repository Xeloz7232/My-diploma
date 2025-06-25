import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const Legend: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    // создаём контрол через конструктор
    const legend = new L.Control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.style.padding = '8px';
      div.style.background = 'white';
      div.style.boxShadow = '0 0 6px rgba(0,0,0,0.3)';
      div.style.borderRadius = '4px';
      div.innerHTML = `
        <h4 style="margin:0 0 4px; font-size:14px;">Легенда</h4>
        <div style="display:flex; align-items:center; margin-bottom:4px;">
          <span style="
            display:inline-block;
            width:16px; height:16px;
            background:rgba(128,128,128,1);
            border-radius:50%;
            margin-right:6px;
          "></span> Только созданные заявки
        </div>
        <div style="display:flex; align-items:center; margin-bottom:4px;">
          <span style="
            display:inline-block;
            width:16px; height:16px;
            background:rgba(24,144,255,1);
            border-radius:50%;
            margin-right:6px;
          "></span> Техника, готовая к возврату
        </div>
        <div style="display:flex; align-items:center;">
          <span style="
            display:inline-block;
            width:16px; height:16px;
            background:linear-gradient(to right, rgba(128,128,128,1) 50%, rgba(24,144,255,1) 50%);
            border-radius:50%;
            margin-right:6px;
          "></span> Смешанные статусы
        </div>
      `;
      return div;
    };

    legend.addTo(map);
    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
};

export default Legend;
