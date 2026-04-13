# 🥙 Kebab Lab ERP

Sistema ERP completo para la gestión de la red de franquicias de Kebab Lab.

## Stack
- **Frontend**: React 18 + Vite + Redux Toolkit + React Router v6
- **Backend**: Node.js + Express + Sequelize + PostgreSQL
- **IA**: Anthropic Claude API
- **Mapas**: React-Leaflet
- **Charts**: Recharts
- **Deploy**: Vercel (frontend) · Railway (backend) · Neon (PostgreSQL)

## Estructura
```
kebab-lab-erp/
├── frontend/   # React + Vite
├── backend/    # Node.js + Express
└── docker/     # Docker configs
```

## Arranque rápido

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/kebab-lab-erp.git
cd kebab-lab-erp

# 2. Backend
cd backend
cp .env.example .env   # Rellenar variables
npm install
npm run dev

# 3. Frontend (nueva terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Módulos
| Módulo | Descripción |
|--------|-------------|
| Dashboard | Stats globales, mapa, actividad reciente |
| Mapa | Todas las franquicias filtradas por comunidad/tipo |
| Ventas / TPV | Control de ventas por local |
| Delivery | Integración Glovo, Uber Eats, Just Eat |
| RRHH | Personal, nóminas, análisis de CVs con IA |
| Facturación | Facturas correlativas, export ZIP gestoría |
| Informes IA | Reports automáticos con Claude + API Agora |
| Asistente IA | Chat contextual sobre el ERP |

## Roles
`superadmin` → `central` → `empresa` → `franquiciado`

## Variables de entorno
Ver `backend/.env.example` y `frontend/.env.example`
