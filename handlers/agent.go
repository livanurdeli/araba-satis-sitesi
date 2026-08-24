package handlers

import (
	"araba-satis-sitesi/services"
	"encoding/json"
	"net/http"
	"strings"
)

type AgentHandler struct {
	agentService *services.AIAgentService
}

func NewAgentHandler(agentService *services.AIAgentService) *AgentHandler {
	return &AgentHandler{agentService: agentService}
}

type AgentChatRequest struct {
	Message   string `json:"message"`
	ListingID int    `json:"listing_id,omitempty"`
}

func (h *AgentHandler) Chat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Sadece POST metodu desteklenir", http.StatusMethodNotAllowed)
		return
	}

	var req AgentChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz istek verisi", http.StatusBadRequest)
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		req.Message = "merhaba"
	}

	resp, err := h.agentService.ProcessQuery(req.Message, req.ListingID)
	if err != nil {
		http.Error(w, "Asistan yanıtı oluşturulurken hata oluştu: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
