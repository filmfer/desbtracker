import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Map, Activity, AlertTriangle, Battery, Navigation, Code, X, Flag, Plus, Trash2, Edit2, CheckCircle, Save, User, Key, Radio, Siren, MapPin, Shield, Lock, Play, Square, Clock, Timer, Route } from 'lucide-react';

// --- Types ---
interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

interface Team {
  id: string;
  name: string;
  username: string; // Required
  password: string; // Required
  status: 'online' | 'offline' | 'sos';
  mode: 'tracking_only' | 'activity';
  location: Location;
  history: Location[]; // Historical breadcrumbs
  batteryLevel: number;
  startTime?: string; // ISO String
  finishTime?: string; // ISO String
}

interface Checkpoint {
  id: string;
  title: string;
  question: string;
  type: 'text' | 'multiple_choice';
  options: string[]; // for multiple_choice
  correctAnswer: string;
  location: { lat: number; lng: number };
  radius: number;
}

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
}

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

interface EventState {
  isRunning: boolean;
  startTime: string | null;
  endTime: string | null;
}

// --- Mock Data Generator (Mutable for CRUD simulation) ---
let GLOBAL_EVENT_STATE: EventState = {
  isRunning: false,
  startTime: null,
  endTime: null
};

let GLOBAL_TEAMS_DB: Team[] = [
  { id: 't1', name: 'Lobo Guará', username: 'team1', password: '123', status: 'online', mode: 'activity', location: { lat: 38.7223, lng: -9.1393, timestamp: new Date().toISOString() }, history: [], batteryLevel: 85 },
  { id: 't2', name: 'Águia Real', username: 'team2', password: '123', status: 'offline', mode: 'tracking_only', location: { lat: 38.7240, lng: -9.1420, timestamp: new Date().toISOString() }, history: [], batteryLevel: 42 },
  { id: 't3', name: 'Raposa Astuta', username: 'team3', password: '123', status: 'sos', mode: 'activity', location: { lat: 38.7210, lng: -9.1350, timestamp: new Date().toISOString() }, history: [], batteryLevel: 15 },
];

let GLOBAL_ADMINS_DB: Admin[] = [
  { id: 'a1', name: 'Chefe Silva', email: 'silva@scouttracker.com', role: 'super_admin' },
  { id: 'a2', name: 'Chefe Maria', email: 'maria@scouttracker.com', role: 'admin' }
];

const MOCK_CHECKPOINTS: Checkpoint[] = [
  {
    id: 'cp1',
    title: 'A Grande Carvalho',
    question: 'Qual é a idade estimada desta árvore?',
    type: 'multiple_choice',
    options: ['50 anos', '100 anos', '200 anos'],
    correctAnswer: '200 anos',
    location: { lat: 38.7230, lng: -9.1400 },
    radius: 50
  },
  {
    id: 'cp2',
    title: 'Estátua do Fundador',
    question: 'O que está escrito na placa?',
    type: 'text',
    options: [],
    correctAnswer: 'Sempre Alerta',
    location: { lat: 38.7215, lng: -9.1380 },
    radius: 30
  }
];

// --- Audio Helper ---
const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Create a more distinct siren pattern (High-Low-High-Low)
    const now = ctx.currentTime;
    
    const createTone = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        // Envelope to avoid clicking
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    };

    // Play 4 tones
    createTone(now, 880, 0.3);       // High A5
    createTone(now + 0.3, 659, 0.3); // Low E5
    createTone(now + 0.6, 880, 0.3); // High A5
    createTone(now + 0.9, 659, 0.3); // Low E5

  } catch (e) {
    console.error('Audio play failed', e);
  }
};

// --- Mock Firestore Service ---
// Modified to read from GLOBAL_TEAMS_DB so CRUD operations persist during simulation
const useTeamsStream = (updateTrigger: number) => {
  const [teams, setTeams] = useState<Team[]>(GLOBAL_TEAMS_DB);

  // Immediate update when trigger changes (e.g., after CRUD)
  useEffect(() => {
      setTeams([...GLOBAL_TEAMS_DB]);
  }, [updateTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate movement on the Global DB
      GLOBAL_TEAMS_DB = GLOBAL_TEAMS_DB.map(team => {
        if (team.status === 'offline') return team;
        
        // Simulate random movement
        const moveLat = (Math.random() - 0.5) * 0.0005;
        const moveLng = (Math.random() - 0.5) * 0.0005;
        
        // Update History
        const newHistory = [...(team.history || []), team.location].slice(-50); // Keep last 50 points to simulate recent path

        return {
          ...team,
          history: newHistory,
          location: {
            ...team.location,
            lat: team.location.lat + moveLat,
            lng: team.location.lng + moveLng,
            timestamp: new Date().toISOString()
          }
        };
      });

      setTeams([...GLOBAL_TEAMS_DB]);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return teams;
};

// --- Flutter Code Snippet (Constant) ---
const FLUTTER_CODE = `
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AdminDashboardMap extends StatefulWidget {
  const AdminDashboardMap({Key? key}) : super(key: key);

  @override
  State<AdminDashboardMap> createState() => _AdminDashboardMapState();
}

class _AdminDashboardMapState extends State<AdminDashboardMap> {
  // Configuração inicial (Ex: Lisboa)
  static const CameraPosition _initialPosition = CameraPosition(
    target: LatLng(38.7223, -9.1393),
    zoom: 14.0,
  );

  GoogleMapController? _controller;
  Set<Marker> _markers = {};

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      // Ouve mudanças na coleção 'teams' em tempo real
      stream: FirebaseFirestore.instance.collection('teams').snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Center(child: Text('Erro ao carregar dados'));
        }

        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        // Converte documentos do Firestore em Marcadores do Google Maps
        _markers = snapshot.data!.docs.map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final location = data['location'] as Map<String, dynamic>?;
          
          // Fallback seguro se a localização não existir
          if (location == null) return null;

          final GeoPoint geoPoint = GeoPoint(
            (location['lat'] as num).toDouble(), 
            (location['lng'] as num).toDouble()
          );

          final String status = data['status'] ?? 'offline';

          return Marker(
            markerId: MarkerId(doc.id),
            position: LatLng(geoPoint.latitude, geoPoint.longitude),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              _getStatusHue(status),
            ),
            infoWindow: InfoWindow(
              title: data['name'] ?? 'Equipa Sem Nome',
              snippet: 'Status: $status | Atualizado: \${_formatTime(data['lastUpdateTimestamp'])}',
            ),
            onTap: () {
               // Aqui podes abrir um modal com detalhes
            }
          );
        }).whereType<Marker>().toSet();

        return GoogleMap(
          mapType: MapType.satellite, // Requisito do Chefia: Satélite
          initialCameraPosition: _initialPosition,
          markers: _markers,
          onMapCreated: (controller) => _controller = controller,
          myLocationEnabled: false,
          zoomControlsEnabled: true,
          compassEnabled: true,
        );
      },
    );
  }

  // Cor do Marcador baseada no Status
  double _getStatusHue(String status) {
    switch (status) {
      case 'online': return BitmapDescriptor.hueGreen;
      case 'sos': return BitmapDescriptor.hueRed; // Vermelho para emergências
      case 'offline': default: return BitmapDescriptor.hueYellow;
    }
  }

  String _formatTime(Timestamp? timestamp) {
    if (timestamp == null) return '--:--';
    return timestamp.toDate().toString().substring(11, 16);
  }
}
`;

// --- Components ---

const ToastContainer = ({ toasts, onDismiss }: { toasts: ToastNotification[], onDismiss: (id: string) => void }) => {
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 3000,
      display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          backgroundColor: toast.type === 'danger' ? '#FEF2F2' : 'white',
          border: `1px solid ${toast.type === 'danger' ? '#EF4444' : '#E5E7EB'}`,
          borderLeft: `4px solid ${toast.type === 'danger' ? '#EF4444' : '#3B82F6'}`,
          borderRadius: '8px', padding: '16px', width: '320px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          pointerEvents: 'auto', display: 'flex', gap: '12px', alignItems: 'start',
          animation: 'slideIn 0.3s ease-out'
        }}>
            {toast.type === 'danger' && <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: toast.type === 'danger' ? '#991B1B' : '#1F2937', marginBottom: '4px' }}>
                    {toast.title}
                </div>
                <div style={{ fontSize: '13px', color: toast.type === 'danger' ? '#B91C1C' : '#6B7280' }}>
                    {toast.message}
                </div>
            </div>
            <button onClick={() => onDismiss(toast.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={16} />
            </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const FlutterCodeModal = ({ onClose }: { onClose: () => void }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(4px)'
  }}>
    <div style={{
      backgroundColor: '#1e1e1e', color: '#d4d4d4',
      width: '80%', height: '80%', borderRadius: '12px',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid #333',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#252526'
      }}>
        <h3 style={{ margin: 0, color: '#4FC3F7', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Code size={20} /> Flutter Code: AdminMapWidget.dart
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
          <X size={24} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', backgroundColor: '#1e1e1e' }}>
        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5' }}>
          {FLUTTER_CODE}
        </pre>
      </div>
      <div style={{ padding: '12px 24px', backgroundColor: '#252526', fontSize: '12px', color: '#888', borderTop: '1px solid #333' }}>
        Copia este código para um ficheiro .dart no teu projeto Flutter. Requer pacotes: cloud_firestore, google_maps_flutter.
      </div>
    </div>
  </div>
);

// --- Timer Display Component ---
const LiveTimer = ({ startDate, endDate }: { startDate?: string, endDate?: string }) => {
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    const update = () => {
        if (!startDate) {
            setDuration('00:00:00');
            return;
        }
        
        const start = new Date(startDate).getTime();
        const end = endDate ? new Date(endDate).getTime() : Date.now();
        const diff = Math.max(0, end - start);
        
        const seconds = Math.floor((diff / 1000) % 60);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)));

        setDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    update();
    
    // If there is an end date, we don't need to keep updating the interval
    if (endDate) return;

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return <span style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{duration}</span>;
};

const TeamListItem: React.FC<{ 
    team: Team, 
    onEdit: () => void,
    onStart: (id: string) => void,
    onStop: (id: string) => void,
    onToggleHistory: (id: string) => void,
    isViewingHistory: boolean
}> = ({ team, onEdit, onStart, onStop, onToggleHistory, isViewingHistory }) => {
  let statusColor = '#9CA3AF'; // gray
  if (team.status === 'online') statusColor = '#10B981'; // green
  if (team.status === 'sos') statusColor = '#EF4444'; // red

  const hasStarted = !!team.startTime;
  const hasFinished = !!team.finishTime;

  return (
    <div 
      style={{
        padding: '16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: isViewingHistory ? '#F0F9FF' : 'white', 
        borderLeft: isViewingHistory ? '4px solid #0EA5E9' : '4px solid transparent',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isViewingHistory ? '#F0F9FF' : '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isViewingHistory ? '#F0F9FF' : 'white'}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
         <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            backgroundColor: '#EFF6FF', color: '#3B82F6', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #DBEAFE'
         }}>
            {team.name.substring(0, 2).toUpperCase()}
         </div>
         <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#1F2937' }}>{team.name}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
              <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{team.status}</span> 
              
              {/* Timer Status for Team */}
              {hasStarted && (
                  <>
                     <span>•</span>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasFinished ? '#059669' : '#2563EB', fontWeight: 600 }}>
                        <Clock size={12} />
                        <LiveTimer startDate={team.startTime} endDate={team.finishTime} />
                     </div>
                  </>
              )}
            </div>
         </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
         {/* History Toggle */}
         <button 
           onClick={(e) => { e.stopPropagation(); onToggleHistory(team.id); }}
           title="Ver Rota no Mapa"
           style={{
             padding: '8px', borderRadius: '50%', border: 'none', 
             backgroundColor: isViewingHistory ? '#E0F2FE' : 'transparent',
             cursor: 'pointer', 
             color: isViewingHistory ? '#0284C7' : '#6B7280', 
             transition: 'all 0.2s'
           }}
           onMouseEnter={(e) => { 
             if (!isViewingHistory) {
                e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.color = '#111827';
             }
           }}
           onMouseLeave={(e) => { 
             if (!isViewingHistory) {
               e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; 
             }
           }}
         >
           <Route size={16} />
         </button>

         {/* Timer Controls */}
         {!hasStarted ? (
            <button 
                onClick={(e) => { e.stopPropagation(); onStart(team.id); }}
                title="Iniciar Tempo da Equipa"
                style={{
                    padding: '8px', borderRadius: '50%', border: 'none', backgroundColor: '#EFF6FF',
                    cursor: 'pointer', color: '#2563EB', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <Play size={16} fill="currentColor" />
            </button>
         ) : !hasFinished ? (
             <button 
                onClick={(e) => { e.stopPropagation(); onStop(team.id); }}
                title="Parar Tempo da Equipa"
                style={{
                    padding: '8px', borderRadius: '50%', border: 'none', backgroundColor: '#FEF2F2',
                    cursor: 'pointer', color: '#EF4444', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <Square size={16} fill="currentColor" />
            </button>
         ) : (
             <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, border: '1px solid #059669', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ECFDF5' }}>
                 FIM
             </div>
         )}

         {/* Edit Button */}
         <button 
           onClick={(e) => { e.stopPropagation(); onEdit(); }}
           style={{
             padding: '8px', borderRadius: '50%', border: 'none', backgroundColor: 'transparent',
             cursor: 'pointer', color: '#6B7280', transition: 'all 0.2s'
           }}
           onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.color = '#111827'; }}
           onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
         >
           <Edit2 size={16} />
         </button>
      </div>
    </div>
  );
};

// --- Checkpoint Editor Component ---
const CheckpointEditor = ({ 
  checkpoint, 
  onSave, 
  onCancel, 
  onDelete 
}: { 
  checkpoint: Partial<Checkpoint>, 
  onSave: (cp: Checkpoint) => void, 
  onCancel: () => void,
  onDelete?: (id: string) => void
}) => {
  const [formData, setFormData] = useState<Partial<Checkpoint>>(checkpoint);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.question) return;
    onSave(formData as Checkpoint);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', width: '500px', maxWidth: '95%',
        borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: '16px 24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#111827', fontWeight: 600 }}>
            {formData.id ? 'Editar Checkpoint' : 'Novo Checkpoint'}
          </h3>
          <button onClick={onCancel} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Location Display */}
          <div style={{ padding: '12px', backgroundColor: '#F3F4F6', borderRadius: '8px', display: 'flex', gap: '16px' }}>
             <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '2px' }}>LATITUDE</label>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#111827' }}>{formData.location?.lat.toFixed(6)}</div>
             </div>
             <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '2px' }}>LONGITUDE</label>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#111827' }}>{formData.location?.lng.toFixed(6)}</div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', color: '#059669', fontSize: '12px', fontWeight: 500, gap: '4px' }}>
                <CheckCircle size={14} /> Localização Definida
             </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Título</label>
            <input 
              type="text" 
              required
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              placeholder="Ex: A Grande Carvalho"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Pergunta</label>
            <textarea 
              required
              value={formData.question || ''}
              onChange={e => setFormData({...formData, question: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minHeight: '80px' }}
              placeholder="O que devem responder?"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Tipo de Resposta</label>
                <select 
                  value={formData.type || 'text'}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="text">Texto Livre</option>
                  <option value="multiple_choice">Múltipla Escolha</option>
                </select>
             </div>
             <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Raio de Ação (m)</label>
                <input 
                  type="number" 
                  value={formData.radius || 50}
                  onChange={e => setFormData({...formData, radius: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
             </div>
          </div>

          {formData.type === 'multiple_choice' && (
            <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4b5563', marginBottom: '8px' }}>Opções (separadas por vírgula)</label>
              <input 
                type="text" 
                value={formData.options?.join(', ') || ''}
                onChange={e => setFormData({...formData, options: e.target.value.split(',').map(s => s.trim())})}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                placeholder="Opção A, Opção B, Opção C"
              />
              <div style={{ marginTop: '8px' }}>
                 <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#4b5563', marginBottom: '4px' }}>Resposta Correta (Exata)</label>
                 <input 
                    type="text"
                    value={formData.correctAnswer || ''}
                    onChange={e => setFormData({...formData, correctAnswer: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
              </div>
            </div>
          )}

           {formData.type === 'text' && (
             <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Resposta Esperada</label>
                 <input 
                    type="text"
                    value={formData.correctAnswer || ''}
                    onChange={e => setFormData({...formData, correctAnswer: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                    placeholder="Palavra-chave para validação automática"
                  />
             </div>
           )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            {formData.id && onDelete && (
              <button 
                type="button" 
                onClick={() => onDelete(formData.id!)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '6px', background: '#FEF2F2', cursor: 'pointer' }}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            )}
            {!formData.id && <div />} {/* Spacer */}
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                onClick={onCancel}
                style={{ padding: '8px 16px', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', color: 'white', border: 'none', borderRadius: '6px', background: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Team Editor Component ---
const TeamEditor = ({ 
  team, 
  onSave, 
  onCancel, 
  onDelete 
}: { 
  team: Partial<Team>, 
  onSave: (team: Team) => void, 
  onCancel: () => void,
  onDelete?: (id: string) => void
}) => {
  const [formData, setFormData] = useState<Partial<Team>>(team);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) return;
    onSave(formData as Team);
  };

  const handleDelete = () => {
    if (confirm('Tem a certeza que deseja eliminar esta equipa? Esta ação não pode ser desfeita.')) {
      if (onDelete && formData.id) onDelete(formData.id);
    }
  };

  const isFormValid = formData.name && formData.username && formData.password;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', width: '500px', maxWidth: '95%',
        borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: '16px 24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#111827', fontWeight: 600 }}>
            {formData.id ? 'Editar Equipa' : 'Nova Equipa'}
          </h3>
          <button onClick={onCancel} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Nome da Equipa</label>
            <input 
              type="text" 
              required
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              placeholder="Ex: Lobo Guará"
            />
          </div>

          <div style={{ padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4B5563', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={12} /> CREDENCIAIS DE ACESSO
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Username</label>
                    <input 
                      type="text" 
                      required
                      value={formData.username || ''}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white' }}
                      placeholder="team1"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Password</label>
                    <input 
                      type="text" 
                      required
                      value={formData.password || ''}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white' }}
                      placeholder="***"
                    />
                  </div>
              </div>
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Modo de Operação</label>
             <select 
               value={formData.mode || 'tracking_only'}
               onChange={e => setFormData({...formData, mode: e.target.value as any})}
               style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
             >
               <option value="tracking_only">Apenas Rastreio (GPS)</option>
               <option value="activity">Modo Atividade (GPS + Jogos)</option>
             </select>
             <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                * No modo "Atividade", a equipa pode ver e responder a checkpoints.
             </div>
          </div>

          {formData.id && (
              <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Status Atual</label>
                 <select 
                   value={formData.status || 'offline'}
                   onChange={e => setFormData({...formData, status: e.target.value as any})}
                   style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                 >
                   <option value="offline">Offline</option>
                   <option value="online">Online</option>
                   <option value="sos">SOS (Emergência)</option>
                 </select>
              </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            {formData.id && onDelete && (
              <button 
                type="button" 
                onClick={handleDelete}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '6px', background: '#FEF2F2', cursor: 'pointer' }}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            )}
            {!formData.id && <div />} {/* Spacer */}
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                onClick={onCancel}
                style={{ padding: '8px 16px', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={!isFormValid}
                style={{ 
                   display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', 
                   color: 'white', border: 'none', borderRadius: '6px', 
                   background: isFormValid ? '#2563EB' : '#93C5FD', 
                   cursor: isFormValid ? 'pointer' : 'not-allowed', 
                   fontWeight: 500 
                }}
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Admin Editor Component ---
const AdminEditor = ({ 
  admin, 
  onSave, 
  onCancel, 
  onDelete 
}: { 
  admin: Partial<Admin>, 
  onSave: (admin: Admin) => void, 
  onCancel: () => void,
  onDelete?: (id: string) => void
}) => {
  const [formData, setFormData] = useState<Partial<Admin>>(admin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    onSave(formData as Admin);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', width: '500px', maxWidth: '95%',
        borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ padding: '16px 24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#111827', fontWeight: 600 }}>
            {formData.id ? 'Editar Chefe' : 'Novo Chefe'}
          </h3>
          <button onClick={onCancel} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Nome</label>
            <input 
              type="text" 
              required
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              placeholder="Ex: Chefe Silva"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Email</label>
            <input 
              type="email" 
              required
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              placeholder="exemplo@scouttracker.com"
            />
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Permissões</label>
             <select 
               value={formData.role || 'admin'}
               onChange={e => setFormData({...formData, role: e.target.value as any})}
               style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
             >
               <option value="admin">Administrador (Normal)</option>
               <option value="super_admin">Super Administrador (Total)</option>
             </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            {formData.id && onDelete && (
              <button 
                type="button" 
                onClick={() => onDelete(formData.id!)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '6px', background: '#FEF2F2', cursor: 'pointer' }}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            )}
            {!formData.id && <div />} {/* Spacer */}
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                onClick={onCancel}
                style={{ padding: '8px 16px', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', color: 'white', border: 'none', borderRadius: '6px', background: '#2563EB', cursor: 'pointer', fontWeight: 500 }}
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Simple Mock Map Component for the Web Preview
const MockMap = ({ 
  teams, 
  checkpoints, 
  activeTab,
  onMapClick,
  onCheckpointClick,
  editingCheckpoint,
  viewingHistoryTeamId
}: { 
  teams: Team[], 
  checkpoints: Checkpoint[], 
  activeTab: 'teams' | 'checkpoints' | 'admins',
  onMapClick: (lat: number, lng: number) => void,
  onCheckpointClick: (cp: Checkpoint) => void,
  editingCheckpoint: Partial<Checkpoint> | null,
  viewingHistoryTeamId: string | null
}) => {
  // Center roughly on mock data
  const centerLat = 38.7223;
  const centerLng = -9.1393;
  const zoomScale = 12000; 
  
  const [hoveredCpId, setHoveredCpId] = useState<string | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
     if (activeTab !== 'checkpoints') return;
     
     const rect = e.currentTarget.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const y = e.clientY - rect.top;
     
     const xPercent = (x / rect.width) * 100;
     const yPercent = (y / rect.height) * 100;
     
     const lat = centerLat - ((yPercent - 50) / zoomScale);
     const lng = ((xPercent - 50) / zoomScale) + centerLng;
     
     onMapClick(lat, lng);
  };

  const getPercentageCoordinates = (lat: number, lng: number) => {
      const y = 50 + (centerLat - lat) * zoomScale;
      const x = 50 + (lng - centerLng) * zoomScale;
      return { x, y };
  };

  const historyTeam = teams.find(t => t.id === viewingHistoryTeamId);

  return (
    <div 
      onClick={handleContainerClick}
      style={{ 
        width: '100%', height: '100%', backgroundColor: '#e5e7eb', 
        position: 'relative', overflow: 'hidden',
        cursor: activeTab === 'checkpoints' ? 'crosshair' : 'default',
        backgroundImage: 'url("https://maps.googleapis.com/maps/api/staticmap?center=38.7223,-9.1393&zoom=15&size=800x800&maptype=satellite&key=YOUR_API_KEY_HERE"), radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundBlendMode: 'overlay', // Blend with gray if image fails (no key)
        backgroundSize: 'cover, 20px 20px'
      }}
      title={activeTab === 'checkpoints' ? "Clique no mapa para adicionar um Checkpoint" : ""}
    >
      {/* Fallback Grid if no API Key image */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none', backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Historical Path Layer */}
      {viewingHistoryTeamId && historyTeam && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <polyline
                points={[...historyTeam.history, historyTeam.location].map(loc => {
                    const coords = getPercentageCoordinates(loc.lat, loc.lng);
                    return `${coords.x}%,${coords.y}%`;
                }).join(' ')}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeDasharray="5,5"
                opacity="0.8"
            />
            {historyTeam.history.map((loc, i) => {
                 const coords = getPercentageCoordinates(loc.lat, loc.lng);
                 return (
                    <circle 
                        key={i} 
                        cx={`${coords.x}%`} 
                        cy={`${coords.y}%`} 
                        r="3" 
                        fill="#3B82F6" 
                        opacity="0.6"
                    />
                 )
            })}
        </svg>
      )}

      <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#4b5563', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '250px', zIndex: 100 }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#111' }}>
           {activeTab === 'teams' ? 'Monitorização em Tempo Real' : activeTab === 'admins' ? 'Gestão de Chefia' : 'Gestão de Checkpoints'}
        </p>
        <p style={{ margin: 0 }}>
           {activeTab === 'teams' 
              ? viewingHistoryTeamId ? `A visualizar histórico de: ${historyTeam?.name}` : 'Este mapa simula a atualização em tempo real via Firestore.' 
              : activeTab === 'admins' ? 'Modo de gestão administrativa. Mapa apenas para visualização.' : 'Clique no mapa para adicionar um novo Checkpoint. Clique num checkpoint para editar.'}
        </p>
        {viewingHistoryTeamId && (
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '4px', border: '1px solid #BFDBFE', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Route size={14} />
                <span>Modo Histórico Ativo</span>
            </div>
        )}
      </div>

      {/* Render Teams */}
      {teams.map(team => {
        const coords = getPercentageCoordinates(team.location.lat, team.location.lng);
        
        let pinColor = '#9CA3AF';
        if (team.status === 'online') pinColor = '#10B981';
        if (team.status === 'sos') pinColor = '#EF4444';
        
        // Dim other teams if viewing history
        const isDimmed = viewingHistoryTeamId && viewingHistoryTeamId !== team.id;

        return (
          <div key={team.id} style={{
            position: 'absolute',
            top: `calc(50% + ${coords.y}%)`,
            left: `calc(50% + ${coords.x}%)`,
            transform: 'translate(-50%, -100%)', // Anchor at bottom center
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transition: 'all 2s linear', // Smooth movement
            zIndex: 10,
            pointerEvents: 'none', // Let clicks pass through to map in checkpoint mode
            opacity: isDimmed ? 0.3 : 1
          }}>
            <div style={{ 
              backgroundColor: 'white', padding: '2px 6px', borderRadius: '4px', 
              fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)', marginBottom: '4px',
              border: `1px solid ${pinColor}`
            }}>
              {team.name}
            </div>
            <div style={{ position: 'relative' }}>
              <Navigation size={32} fill={pinColor} color="#1F2937" />
              {team.status === 'sos' && (
                <div style={{
                  position: 'absolute', inset: -10, borderRadius: '50%',
                  border: '2px solid #EF4444', opacity: 0,
                  animation: 'pulse 1s infinite'
                }} />
              )}
            </div>
          </div>
        );
      })}

      {/* Render Checkpoints */}
      {checkpoints.map(cp => {
        const coords = getPercentageCoordinates(cp.location.lat, cp.location.lng);
        const isEditing = editingCheckpoint?.id === cp.id;

        return (
           <div 
             key={cp.id}
             onClick={(e) => { 
                e.stopPropagation(); 
                if (activeTab === 'checkpoints') onCheckpointClick(cp); 
             }}
             onMouseEnter={() => setHoveredCpId(cp.id)}
             onMouseLeave={() => setHoveredCpId(null)}
             title={cp.title}
             style={{
               position: 'absolute',
               top: `calc(50% + ${coords.y}%)`,
               left: `calc(50% + ${coords.x}%)`,
               transform: `translate(-50%, -100%) scale(${hoveredCpId === cp.id || isEditing ? 1.2 : 1})`,
               cursor: activeTab === 'checkpoints' ? 'pointer' : 'default',
               zIndex: hoveredCpId === cp.id || isEditing ? 30 : 20,
               transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
             }}
           >
             <div style={{ 
                backgroundColor: isEditing ? '#3B82F6' : '#F59E0B', 
                color: 'white', borderRadius: '50%', 
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isEditing ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.2)', 
                border: '2px solid white'
             }}>
                <Flag size={16} fill="white" />
             </div>
             {/* Simple radius visualizer */}
             {(activeTab === 'checkpoints' || isEditing) && (
               <div style={{
                 position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                 width: '80px', height: '80px', borderRadius: '50%',
                 backgroundColor: isEditing ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.2)', 
                 border: `1px dashed ${isEditing ? '#3B82F6' : '#F59E0B'}`,
                 pointerEvents: 'none', zIndex: -1
               }} />
             )}
           </div>
        );
      })}

      {/* Render "Ghost" New Checkpoint Marker */}
      {editingCheckpoint && !editingCheckpoint.id && editingCheckpoint.location && (
         <div style={{
            position: 'absolute',
            top: `calc(50% + ${50 + (centerLat - editingCheckpoint.location.lat) * zoomScale}%)`,
            left: `calc(50% + ${50 + (editingCheckpoint.location.lng - centerLng) * zoomScale}%)`,
            transform: 'translate(-50%, -100%)',
            zIndex: 40,
            pointerEvents: 'none'
         }}>
             <div style={{ 
                backgroundColor: '#3B82F6', color: 'white', borderRadius: '50%', 
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', border: '2px solid white',
                animation: 'bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
             }}>
                <Plus size={20} />
             </div>
             <div style={{
                 position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                 width: '80px', height: '80px', borderRadius: '50%',
                 backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px dashed #3B82F6',
                 pointerEvents: 'none', zIndex: -1
             }} />
         </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes flashBanner {
           0%, 100% { background-color: #EF4444; }
           50% { background-color: #B91C1C; }
        }
        @keyframes bounce {
            0% { transform: scale(0); opacity: 0; }
            80% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  const [dataVersion, setDataVersion] = useState(0);
  const teams = useTeamsStream(dataVersion);
  const [showCode, setShowCode] = useState(false);
  
  // New State for Checkpoints
  const [activeTab, setActiveTab] = useState<'teams' | 'checkpoints' | 'admins'>('teams');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(MOCK_CHECKPOINTS);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Partial<Checkpoint> | null>(null);

  // New State for Team Management
  const [editingTeam, setEditingTeam] = useState<Partial<Team> | null>(null);
  const [viewingHistoryTeamId, setViewingHistoryTeamId] = useState<string | null>(null);

  // New State for Admin Management
  const [admins, setAdmins] = useState<Admin[]>(GLOBAL_ADMINS_DB);
  const [editingAdmin, setEditingAdmin] = useState<Partial<Admin> | null>(null);

  // New State for SOS Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const knownSosTeamsRef = useRef<Set<string>>(new Set());

  // Global Timer State
  const [eventState, setEventState] = useState<EventState>(GLOBAL_EVENT_STATE);

  // Monitor SOS Status
  useEffect(() => {
    const currentSosTeams = teams.filter(t => t.status === 'sos');
    
    currentSosTeams.forEach(team => {
        if (!knownSosTeamsRef.current.has(team.id)) {
            // Trigger Notification
            const newToast: ToastNotification = {
                id: `sos-${team.id}-${Date.now()}`,
                title: 'ALERTA SOS!',
                message: `A equipa "${team.name}" emitiu um pedido de socorro. Localização: ${team.location.lat.toFixed(4)}, ${team.location.lng.toFixed(4)}`,
                type: 'danger'
            };
            setToasts(prev => [...prev, newToast]);
            knownSosTeamsRef.current.add(team.id);
            
            // Play Sound
            playAlertSound();
        }
    });

    // Cleanup resolved SOS from known set (so we alert again if they re-trigger later)
    const currentSosIds = new Set(currentSosTeams.map(t => t.id));
    for (const id of knownSosTeamsRef.current) {
        if (!currentSosIds.has(id)) {
            knownSosTeamsRef.current.delete(id);
        }
    }

  }, [teams]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleMapClick = (lat: number, lng: number) => {
    // Open modal to create new checkpoint
    setEditingCheckpoint({
      title: '',
      question: '',
      type: 'text',
      options: [],
      correctAnswer: '',
      location: { lat, lng },
      radius: 50
    });
  };

  // Checkpoint Actions
  const saveCheckpoint = (cp: Checkpoint) => {
    if (cp.id) {
      setCheckpoints(prev => prev.map(p => p.id === cp.id ? cp : p));
    } else {
      const newCp = { ...cp, id: `cp_${Date.now()}` };
      setCheckpoints(prev => [...prev, newCp]);
    }
    setEditingCheckpoint(null);
  };

  const deleteCheckpoint = (id: string) => {
     setCheckpoints(prev => prev.filter(p => p.id !== id));
     setEditingCheckpoint(null);
  };

  // Team Actions
  const saveTeam = (team: Team) => {
    if (team.id) {
        // Edit existing in Mutable DB
        const index = GLOBAL_TEAMS_DB.findIndex(t => t.id === team.id);
        if(index !== -1) {
            GLOBAL_TEAMS_DB[index] = { ...GLOBAL_TEAMS_DB[index], ...team };
        }
    } else {
        // Create new
        const newTeam: Team = { 
            ...team, 
            id: `t_${Date.now()}`,
            location: { lat: 38.7223, lng: -9.1393, timestamp: new Date().toISOString() } // Default spawn
        };
        GLOBAL_TEAMS_DB.push(newTeam);
    }
    setDataVersion(v => v + 1); // Trigger immediate UI update
    setEditingTeam(null);
  };

  const deleteTeam = (id: string) => {
      GLOBAL_TEAMS_DB = GLOBAL_TEAMS_DB.filter(t => t.id !== id);
      setDataVersion(v => v + 1); // Trigger immediate UI update
      setEditingTeam(null);
  };

  const toggleTeamHistory = (id: string) => {
      setViewingHistoryTeamId(prev => prev === id ? null : id);
  };

  // Team Timer Actions
  const startTeamTimer = (id: string) => {
      const index = GLOBAL_TEAMS_DB.findIndex(t => t.id === id);
      if (index !== -1) {
          GLOBAL_TEAMS_DB[index] = { ...GLOBAL_TEAMS_DB[index], startTime: new Date().toISOString() };
          setDataVersion(v => v + 1);
      }
  };

  const stopTeamTimer = (id: string) => {
      const index = GLOBAL_TEAMS_DB.findIndex(t => t.id === id);
      if (index !== -1) {
          GLOBAL_TEAMS_DB[index] = { ...GLOBAL_TEAMS_DB[index], finishTime: new Date().toISOString() };
          setDataVersion(v => v + 1);
      }
  };

  // Global Timer Actions
  const toggleGlobalTimer = () => {
    if (eventState.isRunning) {
        // Stop
        GLOBAL_EVENT_STATE = { ...GLOBAL_EVENT_STATE, isRunning: false, endTime: new Date().toISOString() };
    } else {
        // Start (reset if new start)
        GLOBAL_EVENT_STATE = { isRunning: true, startTime: new Date().toISOString(), endTime: null };
    }
    setEventState(GLOBAL_EVENT_STATE);
  };


  // Admin Actions
  const saveAdmin = (admin: Admin) => {
    if (admin.id) {
        // Edit existing in Mutable DB
        const index = GLOBAL_ADMINS_DB.findIndex(a => a.id === admin.id);
        if(index !== -1) {
            GLOBAL_ADMINS_DB[index] = { ...GLOBAL_ADMINS_DB[index], ...admin };
        }
    } else {
        // Create new
        const newAdmin: Admin = { 
            ...admin, 
            id: `a_${Date.now()}`,
        };
        GLOBAL_ADMINS_DB.push(newAdmin);
    }
    // Update State to trigger re-render
    setAdmins([...GLOBAL_ADMINS_DB]);
    setEditingAdmin(null);
  };

  const deleteAdmin = (id: string) => {
      GLOBAL_ADMINS_DB = GLOBAL_ADMINS_DB.filter(a => a.id !== id);
      setAdmins([...GLOBAL_ADMINS_DB]);
      setEditingAdmin(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', backgroundColor: '#F9FAFB', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.05)', zIndex: 20 }}>
        <div style={{ padding: '24px', backgroundColor: '#111827', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Map size={24} color="#60A5FA" />
            ScoutTracker
          </h1>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>Plataforma de Chefia</div>
          
          {/* Global Timer Control */}
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Tempo de Prova</span>
                {eventState.isRunning && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontSize: '10px', fontWeight: 700 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', animation: 'pulse 1s infinite' }}></span> LIVE
                    </span>
                )}
             </div>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace', color: 'white' }}>
                    {eventState.startTime ? (
                        <LiveTimer startDate={eventState.startTime} endDate={eventState.endTime || undefined} />
                    ) : (
                        '00:00:00'
                    )}
                </div>
                <button 
                  onClick={toggleGlobalTimer}
                  style={{
                      border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                      backgroundColor: eventState.isRunning ? '#EF4444' : '#10B981',
                      color: 'white', fontWeight: 600, fontSize: '12px',
                      display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                    {eventState.isRunning ? (
                        <><Square size={12} fill="white" /> Parar</>
                    ) : (
                        <><Play size={12} fill="white" /> Iniciar</>
                    )}
                </button>
             </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
           <button 
             onClick={() => setActiveTab('teams')}
             style={{ 
               flex: 1, padding: '12px', border: 'none', background: activeTab === 'teams' ? 'white' : '#F3F4F6',
               fontWeight: 600, color: activeTab === 'teams' ? '#2563EB' : '#6B7280', cursor: 'pointer',
               borderBottom: activeTab === 'teams' ? '2px solid #2563EB' : 'none'
             }}
           >
             Equipas
           </button>
           <button 
             onClick={() => setActiveTab('checkpoints')}
             style={{ 
               flex: 1, padding: '12px', border: 'none', background: activeTab === 'checkpoints' ? 'white' : '#F3F4F6',
               fontWeight: 600, color: activeTab === 'checkpoints' ? '#2563EB' : '#6B7280', cursor: 'pointer',
               borderBottom: activeTab === 'checkpoints' ? '2px solid #2563EB' : 'none'
             }}
           >
             Checkpoints
           </button>
           <button 
             onClick={() => setActiveTab('admins')}
             style={{ 
               flex: 1, padding: '12px', border: 'none', background: activeTab === 'admins' ? 'white' : '#F3F4F6',
               fontWeight: 600, color: activeTab === 'admins' ? '#2563EB' : '#6B7280', cursor: 'pointer',
               borderBottom: activeTab === 'admins' ? '2px solid #2563EB' : 'none',
               display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}
           >
             <Shield size={16} />
           </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'teams' && (
            <>
              <div style={{ padding: '16px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Equipas no Terreno ({teams.length})</span>
                <button 
                   onClick={() => setEditingTeam({ name: '', mode: 'tracking_only' })}
                   style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                 >
                   <Plus size={14} /> Nova
                 </button>
              </div>
              {teams.map(team => (
                <TeamListItem 
                    key={team.id} 
                    team={team} 
                    onEdit={() => setEditingTeam(team)}
                    onStart={startTeamTimer}
                    onStop={stopTeamTimer}
                    onToggleHistory={toggleTeamHistory}
                    isViewingHistory={viewingHistoryTeamId === team.id}
                />
              ))}
            </>
          )}

          {activeTab === 'checkpoints' && (
             <>
               <div style={{ padding: '16px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>Checkpoints ({checkpoints.length})</span>
                 <button 
                   onClick={() => setEditingCheckpoint({ title: '', question: '', type: 'text', options: [], location: { lat: 38.7223, lng: -9.1393 }, radius: 50 })}
                   style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                 >
                   <Plus size={14} /> Nova
                 </button>
               </div>
               {checkpoints.map(cp => (
                 <div 
                   key={cp.id}
                   onClick={() => setEditingCheckpoint(cp)}
                   style={{
                     padding: '16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                     backgroundColor: 'white', transition: 'background-color 0.2s',
                     display: 'flex', gap: '12px'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                 >
                    <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FEF3C7', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' 
                    }}>
                      <Flag size={16} />
                    </div>
                    <div>
                       <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '14px' }}>{cp.title}</div>
                       <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         {cp.question}
                       </div>
                    </div>
                 </div>
               ))}
             </>
          )}

          {activeTab === 'admins' && (
             <>
               <div style={{ padding: '16px', fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>Chefia & Administração ({admins.length})</span>
                 <button 
                   onClick={() => setEditingAdmin({ name: '', role: 'admin' })}
                   style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                 >
                   <Plus size={14} /> Novo
                 </button>
               </div>
               {admins.map(admin => (
                 <div 
                   key={admin.id}
                   onClick={() => setEditingAdmin(admin)}
                   style={{
                     padding: '16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                     backgroundColor: 'white', transition: 'background-color 0.2s',
                     display: 'flex', gap: '12px', alignItems: 'center'
                   }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                 >
                    <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#DBEAFE', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E40AF' 
                    }}>
                      <User size={18} />
                    </div>
                    <div>
                       <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '14px' }}>{admin.name}</div>
                       <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         {admin.role === 'super_admin' && <Shield size={12} color="#D97706" />}
                         <span style={{ color: admin.role === 'super_admin' ? '#D97706' : '#6B7280' }}>
                           {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                         </span>
                       </div>
                    </div>
                 </div>
               ))}
             </>
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #E5E7EB', backgroundColor: 'white' }}>
          <button 
            onClick={() => setShowCode(true)}
            style={{ 
              width: '100%', padding: '12px', backgroundColor: '#2563EB', color: 'white', 
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
          >
            <Code size={18} /> Ver Widget Flutter
          </button>
        </div>
      </div>

      {/* Main Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* SOS BANNER OVERLAY */}
        {teams.some(t => t.status === 'sos') && (
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
                backgroundColor: '#EF4444', color: 'white', padding: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                animation: 'flashBanner 2s infinite'
            }}>
                <Siren size={24} />
                <span>EMERGÊNCIA: PEDIDO DE SOCORRO ATIVO</span>
                <Siren size={24} />
            </div>
        )}

        <MockMap 
           teams={teams} 
           checkpoints={checkpoints} 
           activeTab={activeTab}
           onMapClick={handleMapClick}
           onCheckpointClick={setEditingCheckpoint}
           editingCheckpoint={editingCheckpoint}
           viewingHistoryTeamId={viewingHistoryTeamId}
        />
        
        {/* Overlay Stats - Only show in Teams mode */}
        {activeTab === 'teams' && (
          <div style={{ position: 'absolute', top: '56px', right: '24px', display: 'flex', gap: '16px', zIndex: 30 }}>
            <div style={{ backgroundColor: 'white', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={24} color="#10B981" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Ativas</div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>{teams.filter(t => t.status === 'online').length}</div>
              </div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={24} color="#EF4444" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>SOS</div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>{teams.filter(t => t.status === 'sos').length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCode && <FlutterCodeModal onClose={() => setShowCode(false)} />}
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      
      {editingCheckpoint && (
        <CheckpointEditor 
          checkpoint={editingCheckpoint} 
          onSave={saveCheckpoint} 
          onCancel={() => setEditingCheckpoint(null)} 
          onDelete={deleteCheckpoint}
        />
      )}

      {editingTeam && (
        <TeamEditor 
          team={editingTeam} 
          onSave={saveTeam} 
          onCancel={() => setEditingTeam(null)} 
          onDelete={deleteTeam}
        />
      )}

      {editingAdmin && (
        <AdminEditor 
          admin={editingAdmin} 
          onSave={saveAdmin} 
          onCancel={() => setEditingAdmin(null)} 
          onDelete={deleteAdmin}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);