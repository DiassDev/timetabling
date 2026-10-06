# Timetabling

Sistema de planejamento acadêmico e geração de horários. O frontend React consome a API REST do backend Django.

## Executar localmente

Abra dois terminais na pasta do projeto.

### API Django

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

A API fica disponível em `http://127.0.0.1:8000/api/`. O frontend usa um proxy local do Vite para essa URL.

### Frontend React

```powershell
cd frontend/frontend
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente `http://localhost:5173`). Para apontar o frontend a uma API hospedada em outro endereço, crie `frontend/frontend/.env.local` com `VITE_API_URL=https://seu-servidor/api`.

## Funcionalidades

- Grade semanal consultada da API, com busca por disciplina, turma ou professor e filtro por curso.
- Cadastro e remoção de alocações, cursos, professores, disciplinas, faixas de horário e turmas.
- Indicador do estado da conexão e mensagens quando a API estiver indisponível.

## Rotas usadas

`/api/courses/`, `/api/professors/`, `/api/subjects/`, `/api/timeslots/`, `/api/classs-groups/` e `/api/schedule/`.

O caminho `classs-groups` mantém a grafia atualmente definida pelo roteador do backend.

## Desenvolvedores

Pedro Dias, Pedro Gabriel e Gabriel Ronald.
