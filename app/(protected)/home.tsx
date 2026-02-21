import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Clipboard, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticSelection, hapticError } from '../../lib/haptics';
import { TONES, CATEGORIES, RizzStats } from '../../types/rizz';

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState('chill');
  const [selectedCategory, setSelectedCategory] = useState('casual');
  const [responses, setResponses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RizzStats | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/rizz/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleGenerate = async () => {
    if (inputText.length < 5) {
      hapticError();
      return;
    }
    hapticSelection();
    setLoading(true);
    setResponses([]);
    try {
      const res = await api.post('/rizz/generate', {
        input_text: inputText,
        tone: selectedTone,
        category: selectedCategory,
      });
      setResponses(res.data.responses || []);
      hapticSuccess();
      fetchStats();
    } catch (err) {
      hapticError();
      console.error('Generate failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    Clipboard.setString(text);
    hapticSuccess();
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const getToneInfo = (toneId: string) => {
    return TONES.find(t => t.id === toneId) || TONES[3];
  };

  return (
    <SafeAreaView className="flex-1 bg-pink-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-8">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-pink-900">RizzCheck</Text>
              <Text className="text-sm text-gray-500">AI-powered responses</Text>
            </View>
            {stats && (
              <View className="items-center rounded-2xl bg-pink-100 px-4 py-2">
                <Text className="text-xl font-bold text-pink-600">{stats.total_rizzes}</Text>
                <Text className="text-xs text-pink-500">rizzes</Text>
              </View>
            )}
          </View>

          {/* Input */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Paste the message you received:</Text>
            <TextInput
              className="min-h-24 rounded-xl bg-white p-4 text-base text-gray-800"
              placeholder="Hey, I was wondering if you wanted to..."
              placeholderTextColor="#9ca3af"
              multiline
              value={inputText}
              onChangeText={setInputText}
              maxLength={1000}
            />
          </View>

          {/* Tone Selection */}
          <Text className="mb-2 text-sm font-medium text-gray-700">Select your vibe:</Text>
          <FlatList
            horizontal
            data={TONES}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`mr-2 rounded-full px-4 py-2 ${selectedTone === item.id ? 'border-2' : ''}`}
                style={{
                  backgroundColor: item.color + '20',
                  borderColor: selectedTone === item.id ? item.color : 'transparent',
                }}
                onPress={() => {
                  hapticSelection();
                  setSelectedTone(item.id);
                }}
              >
                <Text style={{ color: item.color }} className="text-sm font-medium">
                  {item.emoji} {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Category */}
          <Text className="mb-2 text-sm font-medium text-gray-700">Context:</Text>
          <FlatList
            horizontal
            data={CATEGORIES}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            className="mb-6"
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`mr-2 rounded-full px-3 py-2 ${selectedCategory === item.id ? 'border-2 border-pink-500 bg-pink-100' : 'bg-gray-100'}`}
                onPress={() => {
                  hapticSelection();
                  setSelectedCategory(item.id);
                }}
              >
                <Text className={`text-sm ${selectedCategory === item.id ? 'text-pink-700 font-medium' : 'text-gray-600'}`}>
                  {item.emoji} {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Generate Button */}
          <TouchableOpacity
            className={`mb-6 rounded-xl py-4 ${inputText.length >= 5 ? 'bg-pink-600' : 'bg-gray-300'}`}
            onPress={handleGenerate}
            disabled={loading || inputText.length < 5}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-center text-lg font-bold text-white">
                Generate Rizz ✨
              </Text>
            )}
          </TouchableOpacity>

          {/* Responses */}
          {responses.length > 0 && (
            <View>
              <Text className="mb-3 text-lg font-bold text-gray-800">Pick your response:</Text>
              {responses.map((response, idx) => (
                <TouchableOpacity
                  key={idx}
                  className="mb-3 rounded-xl bg-white p-4 shadow-sm"
                  onPress={() => handleCopy(response, idx)}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 text-base text-gray-800 leading-6">{response}</Text>
                    <View className="ml-3">
                      {copied === idx ? (
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                      ) : (
                        <Ionicons name="copy-outline" size={24} color="#ec4899" />
                      )}
                    </View>
                  </View>
                  <Text className="mt-2 text-xs text-gray-400">Tap to copy</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Stats Footer */}
          {stats && (
            <View className="mt-6 flex-row justify-around rounded-2xl bg-white p-4 shadow-sm">
              <View className="items-center">
                <Text className="text-xl font-bold text-pink-600">{stats.current_streak}</Text>
                <Text className="text-xs text-gray-500">Day Streak</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-pink-600">{stats.longest_streak}</Text>
                <Text className="text-xs text-gray-500">Best Streak</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-pink-600">{stats.free_uses_today}/5</Text>
                <Text className="text-xs text-gray-500">Free Today</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
