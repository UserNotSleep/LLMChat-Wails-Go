package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
)

type Chat struct{}

type OllamaRequest struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

func NewChat() *Chat {
	return &Chat{}
}

func ApiRequest(message string) (string, error) {
	url := "http://localhost:11434/api/generate"
	reqBody := map[string]interface{}{
		"model":  "deepseek-r1:8b",
		"prompt": message,
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

func (c *Chat) SendMessage(message string) (string, error) {
	response, err := ApiRequest(message)
	if err != nil {
		return "", err
	}
	think, answer := extractThink(response)
	fmt.Println(think)
	return answer, nil
}
