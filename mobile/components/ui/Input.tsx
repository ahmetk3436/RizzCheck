import React, { useState } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { cn } from '../../lib/cn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  dark?: boolean;
}

export default function Input({ label, error, dark, className, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="w-full">
      {label && (
        <Text className={cn(
          'mb-2 text-sm font-semibold',
          dark ? 'text-gray-400' : 'text-gray-700'
        )}>
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'w-full rounded-2xl border px-4 py-4 text-base',
          dark
            ? cn(
                'bg-white/5 text-white',
                isFocused
                  ? 'border-primary-500'
                  : 'border-white/10',
              )
            : cn(
                'bg-white text-gray-900',
                isFocused
                  ? 'border-primary-500'
                  : 'border-gray-300',
              ),
          error && 'border-red-500',
          className
        )}
        placeholderTextColor={dark ? '#6b7280' : '#9ca3af'}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Text className="mt-1 text-sm text-red-400">{error}</Text>
      )}
    </View>
  );
}
