import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
type Course = { id: number; name: string; course_id: string }
type Professor = { id: number; name: string; email: string; professor_id: string }
type Subject = { id: number; name: string; subject_id: string; workload: number; course: number }
type Slot = { id: number; weekday: number; weekday_display?: string; start_time: string; end_time: string }
type Group = { id: number; name: string; subject: number; professor: number; semester: number }
type Entry = { id: number; class_group: number; timeslot: number }
type Data = { courses: Course[]; professors: Professor[]; subjects: Subject[]; timeslots: Slot[]; groups: Group[]; schedule: Entry[] }
type Resource = 'courses' | 'professors' | 'subjects' | 'timeslots' | 'groups'
type ViewName = Resource
const paths: Record<Resource | 'schedule', string> = { courses: 'courses/', professors: 'professors/', subjects: 'subjects/', timeslots: 'timeslots/', groups: 'classs-groups/', schedule: 'schedule/' }
const empty: Data = { courses: [], professors: [], subjects: [], timeslots: [], groups: [], schedule: [] }

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  if (!response.ok) {
    let message = `Erro ${response.status}`
    try { const body = await response.json(); message = Object.values(body).flat().join(' ') || message } catch { /* resposta sem JSON */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
function list<T>(value: T[] | { results: T[] }): T[] { return Array.isArray(value) ? value : value.results }
function Icon({ name }: { name: string }) { const icons: Record<string, string> = { grid: '▦', calendar: '▣', book: '▤', users: '♙', clock: '◷', settings: '⚙', plus: '+', search: '⌕', menu: '☰', chevron: '⌄', close: '×', trash: '⌫', check: '✓', arrow: '↗', alert: '!' }; return <span className="icon" aria-hidden="true">{icons[name] || '•'}</span> }

function App() {
  const [data, setData] = useState<Data>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState<'schedule' | 'courses' | 'professors' | 'subjects' | 'timeslots' | 'groups'>('schedule')
  const [query, setQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [weekOffset, setWeekOffset] = useState(0)
  const [modal, setModal] = useState<'entry' | Resource | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [courses, professors, subjects, timeslots, groups, schedule] = await Promise.all([
        api<Course[] | { results: Course[] }>(paths.courses), api<Professor[] | { results: Professor[] }>(paths.professors), api<Subject[] | { results: Subject[] }>(paths.subjects), api<Slot[] | { results: Slot[] }>(paths.timeslots), api<Group[] | { results: Group[] }>(paths.groups), api<Entry[] | { results: Entry[] }>(paths.schedule),
      ])
      setData({ courses: list(courses), professors: list(professors), subjects: list(subjects), timeslots: list(timeslots), groups: list(groups), schedule: list(schedule) })
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível conectar à API.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer) }, [notice])

  const getGroup = (id: number) => data.groups.find((item) => item.id === id)
  const getSubject = (id?: number) => data.subjects.find((item) => item.id === id)
  const getSlot = (id: number) => data.timeslots.find((item) => item.id === id)
  const getProfessor = (id?: number) => data.professors.find((item) => item.id === id)
  const filteredEntries = useMemo(() => data.schedule.filter((entry) => {
    const group = data.groups.find((item) => item.id === entry.class_group); const subject = data.subjects.find((item) => item.id === group?.subject)
    const matchesCourse = courseFilter === 'all' || String(subject?.course) === courseFilter
    const term = query.toLocaleLowerCase('pt-BR')
    const matchesQuery = !term || [group?.name, subject?.name, data.professors.find((p) => p.id === group?.professor)?.name].some((s) => s?.toLocaleLowerCase('pt-BR').includes(term))
    return matchesCourse && matchesQuery
  }), [data, courseFilter, query])
  const totalHours = data.subjects.reduce((sum, item) => sum + Number(item.workload || 0), 0)
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  monday.setDate(monday.getDate() + weekOffset * 7)
  const weekDates = Array.from({ length: 5 }, (_, i) => { const date = new Date(monday); date.setDate(monday.getDate() + i); return date })
  const weekLabel = weekOffset === 0 ? 'Esta semana' : `${weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekDates[4].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  async function save() {
    setSaving(true)
    try {
      const resource = modal
      if (!resource) return
      const payload = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, ['course', 'subject', 'professor', 'weekday', 'semester', 'workload', 'class_group', 'timeslot'].includes(key) ? Number(value) : value]))
      await api(resource === 'entry' ? paths.schedule : paths[resource], { method: 'POST', body: JSON.stringify(payload) })
      setModal(null); setDraft({}); setNotice('Registro salvo com sucesso.'); await refresh()
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível salvar.') } finally { setSaving(false) }
  }
  async function remove(resource: Resource | 'schedule', id: number) {
    if (!window.confirm('Deseja realmente excluir este registro?')) return
    try { await api(`${paths[resource]}${id}/`, { method: 'DELETE' }); setNotice('Registro removido.'); await refresh() } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível excluir.') }
  }
  const nav = [{ id: 'schedule' as const, label: 'Grade horária', icon: 'calendar' }, { id: 'courses' as const, label: 'Cursos', icon: 'grid' }, { id: 'subjects' as const, label: 'Disciplinas', icon: 'book' }, { id: 'professors' as const, label: 'Professores', icon: 'users' }, { id: 'timeslots' as const, label: 'Faixas de horário', icon: 'clock' }, { id: 'groups' as const, label: 'Turmas', icon: 'users' }]
  const titles: Record<typeof view, string> = { schedule: 'Grade horária', courses: 'Cursos', subjects: 'Disciplinas', professors: 'Professores', timeslots: 'Faixas de horário', groups: 'Turmas' }
  const modalTitles: Record<string, string> = { entry: 'Nova alocação', courses: 'Novo curso', professors: 'Novo professor', subjects: 'Nova disciplina', timeslots: 'Nova faixa de horário', groups: 'Nova turma' }

  function formFields(): { name: string; label: string; type?: string; options?: { value: string; label: string }[] }[] {
    if (modal === 'entry') return [{ name: 'class_group', label: 'Turma', options: data.groups.map((g) => ({ value: String(g.id), label: `${g.name} · ${getSubject(g.subject)?.name || 'Disciplina'}` })) }, { name: 'timeslot', label: 'Faixa de horário', options: data.timeslots.map((s) => ({ value: String(s.id), label: `${s.weekday_display || days[s.weekday - 1]} · ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}` })) }]
    if (modal === 'courses') return [{ name: 'name', label: 'Nome do curso' }, { name: 'course_id', label: 'Código do curso' }]
    if (modal === 'professors') return [{ name: 'name', label: 'Nome completo' }, { name: 'email', label: 'E-mail', type: 'email' }, { name: 'professor_id', label: 'Matrícula' }]
    if (modal === 'subjects') return [{ name: 'name', label: 'Nome da disciplina' }, { name: 'subject_id', label: 'Código' }, { name: 'workload', label: 'Carga horária (horas)', type: 'number' }, { name: 'course', label: 'Curso', options: data.courses.map((c) => ({ value: String(c.id), label: c.name })) }]
    if (modal === 'timeslots') return [{ name: 'weekday', label: 'Dia da semana', options: days.map((day, i) => ({ value: String(i + 1), label: day })) }, { name: 'start_time', label: 'Início', type: 'time' }, { name: 'end_time', label: 'Término', type: 'time' }]
    return [{ name: 'name', label: 'Identificação da turma' }, { name: 'subject', label: 'Disciplina', options: data.subjects.map((s) => ({ value: String(s.id), label: s.name })) }, { name: 'professor', label: 'Professor', options: data.professors.map((p) => ({ value: String(p.id), label: p.name })) }, { name: 'semester', label: 'Semestre', type: 'number' }]
  }

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Icon name="calendar" /></div><div><strong>Tempo</strong><small>GESTÃO ACADÊMICA</small></div></div>
      <div className="workspace-label">ESPAÇO DE TRABALHO</div><button className="workspace"><span className="workspace-avatar">U</span><span><b>Universidade</b><small>Campus principal</small></span><Icon name="chevron" /></button>
      <div className="nav-label">MENU PRINCIPAL</div><nav>{nav.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => { setView(item.id); setQuery('') }}><Icon name={item.icon} /><span>{item.label}</span>{view === item.id && <i />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="api-status"><span className={`status-dot ${error ? 'offline' : loading ? 'loading' : 'online'}`} /><span>{error ? 'API desconectada' : loading ? 'Conectando à API…' : 'API conectada'}</span><button onClick={() => void refresh()} title="Atualizar dados">↻</button></div><div className="profile"><div className="profile-avatar">JD</div><div><b>Gestor acadêmico</b><small>Administrador</small></div><Icon name="chevron" /></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumbs"><span>Visão geral</span><b>/</b><strong>{titles[view]}</strong></div><div className="top-actions"><div className="today"><span className="calendar-mini">▣</span>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}</div><button className="avatar-small" title="Perfil">JD</button></div></header>
      <div className="content"><div className="page-heading"><div><div className="eyebrow">PLANEJAMENTO ACADÊMICO</div><h1>{titles[view]}</h1><p>{view === 'schedule' ? 'Organize aulas, distribua horários e acompanhe a semana.' : `Gerencie os registros de ${titles[view].toLocaleLowerCase('pt-BR')} cadastrados na API.`}</p></div><button className="primary-button" onClick={() => { setDraft({}); setModal(view === 'schedule' ? 'entry' : view); if (view === 'schedule' && (!data.groups.length || !data.timeslots.length)) setNotice('Cadastre turmas e faixas de horário antes de criar alocações.') }}><Icon name="plus" />{view === 'schedule' ? 'Nova alocação' : `Novo registro`}</button></div>
      {error && <div className="error-banner"><Icon name="alert"/><div><b>Não foi possível carregar os dados da API</b><span>{error}. Confira se o servidor Django está ativo e a URL da API está correta.</span></div><button onClick={() => void refresh()}>Tentar novamente</button></div>}
      {view === 'schedule' ? <>
        <section className="stats"><div className="stat-card"><div className="stat-icon violet"><Icon name="calendar" /></div><div><span>Aulas alocadas</span><strong>{data.schedule.length.toString().padStart(2, '0')}</strong><small>na semana</small></div><span className="stat-arrow">↗</span></div><div className="stat-card"><div className="stat-icon blue"><Icon name="book" /></div><div><span>Disciplinas</span><strong>{data.subjects.length.toString().padStart(2, '0')}</strong><small>cadastradas</small></div><span className="stat-arrow">↗</span></div><div className="stat-card"><div className="stat-icon amber"><Icon name="users" /></div><div><span>Professores</span><strong>{data.professors.length.toString().padStart(2, '0')}</strong><small>no corpo docente</small></div><span className="stat-arrow">↗</span></div><div className="stat-card"><div className="stat-icon green"><Icon name="clock" /></div><div><span>Carga horária</span><strong>{totalHours}</strong><small>horas cadastradas</small></div><span className="stat-arrow">↗</span></div></section>
        <section className="schedule-panel"><div className="panel-header"><div><div className="panel-title-row"><h2>Horários da semana</h2><span className="live-badge"><i /> AO VIVO</span></div><p>Visualização semanal das aulas programadas</p></div><div className="view-controls"><button className="icon-button" title="Semana anterior" onClick={() => setWeekOffset((offset) => offset - 1)}>‹</button><button className="week-button" onClick={() => setWeekOffset(0)}>{weekLabel} <Icon name="chevron" /></button><button className="icon-button" title="Próxima semana" onClick={() => setWeekOffset((offset) => offset + 1)}>›</button></div></div>
          <div className="filters"><label className="search"><Icon name="search"/><input placeholder="Buscar disciplina, turma ou professor…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label className="filter-select"><span>Curso:</span><select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}><option value="all">Todos os cursos</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label><button className="filter-button" onClick={() => { setCourseFilter('all'); setQuery('') }}>Limpar filtros</button></div>
          <div className="table-wrap"><table className="schedule-table"><thead><tr><th className="time-head">HORÁRIO</th>{days.slice(0, 5).map((day, i) => <th key={day}><span className="day-name">{day.slice(0, 3).toUpperCase()}</span><span className={`day-number ${weekOffset === 0 && weekDates[i].toDateString() === today.toDateString() ? 'current' : ''}`}>{weekDates[i].getDate()}</span></th>)}</tr></thead><tbody>{Array.from(new Set(data.timeslots.map((s) => `${s.start_time.slice(0, 5)}|${s.end_time.slice(0, 5)}`))).sort().map((time) => { const [start, end] = time.split('|'); return <tr key={time}><th className="time-cell"><b>{start}</b><small>{end}</small></th>{[1, 2, 3, 4, 5].map((weekday) => { const slot = data.timeslots.find((s) => s.weekday === weekday && s.start_time.slice(0, 5) === start && s.end_time.slice(0, 5) === end); const entries = filteredEntries.filter((entry) => getSlot(entry.timeslot)?.id === slot?.id); return <td key={weekday}>{entries.map((entry, index) => { const group = getGroup(entry.class_group); const subject = getSubject(group?.subject); const professor = getProfessor(group?.professor); const colors = ['lilac', 'mint', 'peach', 'sky']; return <div key={entry.id} className={`class-card ${colors[(group?.id || index) % colors.length]}`}><button className="delete-entry" title="Remover alocação" onClick={() => void remove('schedule', entry.id)}><Icon name="close" /></button><b>{subject?.name || `Disciplina #${group?.subject}`}</b><span>{group?.name || `Turma #${group?.id}`}</span><small>{professor?.name || 'Professor não informado'}</small></div> })}</td> })}</tr> })}</tbody></table>
          {!loading && (!data.timeslots.length || !filteredEntries.length) && <div className="empty-state"><div className="empty-icon"><Icon name={data.timeslots.length ? 'search' : 'calendar'} /></div><b>{data.timeslots.length ? 'Nenhuma aula encontrada' : 'Sua grade começa aqui'}</b><span>{data.timeslots.length ? 'Ajuste os filtros ou crie uma nova alocação.' : 'Cadastre faixas de horário e turmas para visualizar a semana.'}</span>{data.timeslots.length === 0 && <button className="text-button" onClick={() => { setView('timeslots'); setModal('timeslots') }}>Cadastrar primeiro horário <Icon name="arrow" /></button>}</div>}
          </div><div className="panel-footer"><span>Exibindo <b>{filteredEntries.length}</b> de <b>{data.schedule.length}</b> alocações</span><span><i className="legend-dot" /> Horário local · Brasília</span></div></section>
      </> : <section className="schedule-panel records-panel"><div className="panel-header"><div><h2>{titles[view]} cadastrados</h2><p>Dados sincronizados diretamente com a API</p></div><span className="count-badge">{data[view].length} registros</span></div><div className="filters"><label className="search"><Icon name="search"/><input placeholder={`Buscar em ${titles[view].toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} /></label></div><div className="table-wrap"><Records view={view} data={data} query={query} onRemove={(id) => void remove(view, id)} /></div></section>}
      <footer className="footer"><span>© 2025 Tempo · Gestão acadêmica inteligente</span><span><i className={`status-dot ${error ? 'offline' : 'online'}`} /> Sincronizado com a API</span></footer>
      </div>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null) }}><form className="modal" onSubmit={(e) => { e.preventDefault(); void save() }}><div className="modal-head"><div><span className="eyebrow">GESTÃO ACADÊMICA</span><h2>{modalTitles[modal]}</h2></div><button type="button" className="icon-button" onClick={() => setModal(null)}><Icon name="close" /></button></div><p className="modal-help">Preencha os dados abaixo para salvar na API.</p>{formFields().map((field) => <label className="form-field" key={field.name}><span>{field.label}</span>{field.options ? <select required value={draft[field.name] || ''} onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })}><option value="" disabled>Selecione…</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required type={field.type || 'text'} min={field.type === 'number' ? 1 : undefined} value={draft[field.name] || ''} onChange={(e) => setDraft({ ...draft, [field.name]: e.target.value })} />}</label>)}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : <><Icon name="check" /> Salvar registro</>}</button></div></form></div>}
    {notice && <div className="toast"><span className="toast-check">✓</span>{notice}<button onClick={() => setNotice('')}><Icon name="close" /></button></div>}
  </div>
}

function Records({ view, data, query, onRemove }: { view: ViewName; data: Data; query: string; onRemove: (id: number) => void }) {
  const term = query.toLocaleLowerCase('pt-BR')
  const rows = view === 'courses' ? data.courses.filter((x) => `${x.name} ${x.course_id}`.toLocaleLowerCase('pt-BR').includes(term)).map((x) => ({ id: x.id, cells: [x.course_id, x.name, `${data.subjects.filter((s) => s.course === x.id).length} disciplinas`] }))
    : view === 'professors' ? data.professors.filter((x) => `${x.name} ${x.email} ${x.professor_id}`.toLocaleLowerCase('pt-BR').includes(term)).map((x) => ({ id: x.id, cells: [x.professor_id, x.name, x.email] }))
    : view === 'subjects' ? data.subjects.filter((x) => `${x.name} ${x.subject_id}`.toLocaleLowerCase('pt-BR').includes(term)).map((x) => ({ id: x.id, cells: [x.subject_id, x.name, data.courses.find((c) => c.id === x.course)?.name || '—', `${x.workload}h`] }))
    : view === 'timeslots' ? data.timeslots.filter((x) => `${x.weekday_display || days[x.weekday - 1]} ${x.start_time} ${x.end_time}`.toLocaleLowerCase('pt-BR').includes(term)).map((x) => ({ id: x.id, cells: [x.weekday_display || days[x.weekday - 1], x.start_time.slice(0, 5), x.end_time.slice(0, 5)] }))
    : data.groups.filter((x) => `${x.name} ${data.subjects.find((s) => s.id === x.subject)?.name}`.toLocaleLowerCase('pt-BR').includes(term)).map((x) => ({ id: x.id, cells: [x.name, data.subjects.find((s) => s.id === x.subject)?.name || '—', data.professors.find((p) => p.id === x.professor)?.name || '—', `${x.semester}º`] }))
  const labels: Record<string, string[]> = { courses: ['CÓDIGO', 'CURSO', 'DISCIPLINAS'], professors: ['MATRÍCULA', 'PROFESSOR', 'E-MAIL'], subjects: ['CÓDIGO', 'DISCIPLINA', 'CURSO', 'CARGA'], timeslots: ['DIA', 'INÍCIO', 'TÉRMINO'], groups: ['TURMA', 'DISCIPLINA', 'PROFESSOR', 'SEMESTRE'] }
  return <table className="records-table"><thead><tr>{labels[view].map((label) => <th key={label}>{label}</th>)}<th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{row.cells.map((cell, i) => <td key={i}>{i === 0 ? <b>{cell}</b> : cell}</td>)}<td><button className="row-delete" title="Excluir registro" onClick={() => onRemove(row.id)}><Icon name="trash" /></button></td></tr>)}</tbody></table>
}
export default App
