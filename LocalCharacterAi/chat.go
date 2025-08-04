package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
)

type Chat struct {
	History []Message
}

type OllamaRequest struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

func NewChat() *Chat {
	history, err := loadHistory("chat_log.json")
	if err != nil {
		history = []Message{}
	}
	return &Chat{History: history}
}

func historyToPromt(history []Message) string {
	var prompt string
	for _, msg := range history {
		if msg.Role == "user" {
			prompt += "User" + msg.Content + "\n"
		} else {
			prompt += "Assistant" + msg.Content + "\n"
		}
	}
	return prompt
}

func ApiRequest(message string, history []Message) (string, error) {
	fullHistory := append(history, Message{Role: "user", Content: message})
	prompt := historyToPromt(fullHistory)

	url := "http://localhost:11434/api/generate"
	reqBody := map[string]interface{}{
		"model":  "deepseek-r1:8b",
		"prompt": prompt,
		"stream": false,
	}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("ошибка маршалинга JSON: %v", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("ошибка HTTP-запроса: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ошибка чтения ответа: %v", err)
	}

	var lamaResp struct {
		Response string `json:"response"`
		Done     bool   `json:"done"`
	}
	if err := json.Unmarshal(body, &lamaResp); err != nil {
		return "", fmt.Errorf("ошибка анмаршалинга JSON: %v", err)
	}
	return lamaResp.Response, nil
}

func extractThink(input string) (think string, answer string) {
	re := regexp.MustCompile(`(?s)<think>(.*?)</think>`)
	matches := re.FindStringSubmatch(input)

	if len(matches) > 1 {
		think = matches[1]
	}
	answer = re.ReplaceAllString(input, "")

	return
}

func (c *Chat) GetHistory() (string, error) {
	data, err := json.Marshal(c.History)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func openNewChat() {
	fmt.Print("NewChat")
}

func (c *Chat) SendMessage(message string) (string, error) {
	c.History = append(c.History, Message{Role: "user", Content: message})

	response, err := ApiRequest(message, c.History)
	if err != nil {
		return "", err
	}
	think, answer := extractThink(response)
	fmt.Println(think)

	c.History = append(c.History, Message{Role: "assistant", Content: answer})

	err = saveHistory("chat_log.json", c.History)
	if err != nil {
		return "", err
	}

	return answer, nil
}
