import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useApiList } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { 
  MessageSquare, 
  Mail, 
  Calendar, 
  Search, 
  Eye, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { format } from "date-fns";

export default function ContactMessages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // Use the new API endpoint
  const { data: messages = [], isLoading } = useApiList(
    ['admin', 'contact-messages'],
    async () => {
      const { data } = await apiClient.get('/admin/contact-messages');
      return data.data;
    }
  );

  const filteredMessages = messages.filter((msg: any) => 
    msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Contact Inquiries" 
        description="View and manage messages submitted through the public Contact Us form."
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, email, or subject..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-slate-50 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Messages List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-medium text-slate-700 flex justify-between items-center">
            <span>Inbox ({filteredMessages.length})</span>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p>No messages found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredMessages.map((msg: any) => (
                  <li 
                    key={msg.id} 
                    className={`p-4 hover:bg-indigo-50/50 cursor-pointer transition-colors ${selectedMessage?.id === msg.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-slate-900 truncate pr-4">{msg.name}</h4>
                      <span className="text-xs text-slate-500 whitespace-nowrap flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {msg.created_at ? format(new Date(msg.created_at), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-700 mb-1 truncate">{msg.subject || 'No Subject'}</div>
                    <p className="text-sm text-slate-500 truncate">{msg.message}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {msg.status === 'pending' ? <Clock size={12} className="mr-1 text-amber-500" /> : <CheckCircle2 size={12} className="mr-1 text-emerald-500" />}
                        <span className="capitalize">{msg.status || 'Pending'}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Message Detail View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[700px] flex flex-col overflow-hidden">
          {selectedMessage ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 mb-4">{selectedMessage.subject || 'No Subject'}</h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                    {selectedMessage.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{selectedMessage.name}</h4>
                    <a href={`mailto:${selectedMessage.email}`} className="text-sm text-indigo-600 hover:underline flex items-center mt-0.5">
                      <Mail size={14} className="mr-1" /> {selectedMessage.email}
                    </a>
                    <div className="text-xs text-slate-500 mt-1 flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {selectedMessage.created_at ? format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => window.location.href = `mailto:${selectedMessage.email}`}>
                  Reply via Email
                </Button>
                {selectedMessage.status === 'pending' && (
                   <Button variant="primary" disabled>
                     Mark as Read
                   </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Eye className="w-16 h-16 mb-4 text-slate-200" />
              <p className="text-lg font-medium text-slate-600">Select a message</p>
              <p className="text-sm mt-1">Click on a message from the list to view its full contents here.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
