package main

import (
	"encoding/json"
	"io/ioutil"
	"os"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func saveHistory(filname string, history []Message) error {
	data, err := json.MarshalIndent(history, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(filname, data, 0644)
}

func loadHistory(filename string) ([]Message, error) {
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		return []Message{}, nil
	}

	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var history []Message
	err = json.Unmarshal(data, &history)
	return history, err
}
