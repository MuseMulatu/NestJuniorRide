import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Feather, MaterialIcons, Entypo, FontAwesome5 } from '@expo/vector-icons';

dayjs.extend(relativeTime);

interface BadgeProps {
  text: string;
  color: string; // Tailwind CSS background color class, e.g., "bg-blue-500"
}

export const Badge: React.FC<BadgeProps> = ({ text, color }) => {
  return (
    <View className={`px-2 py-1 rounded-full ${color}`}>
      <Text className="text-white text-xs font-JakartaSemiBold">{text}</Text>
    </View>
  );
};

interface JobCardProps {
  job: {
    id: number;
    title: string;
    description: string;
    job_type: 'full_time' | 'part_time' | 'freelance' | 'remote' | 'hybrid';
    location: string | null;
    salary_range: string | null;
    employer_name: string;
    employer_rating: number | null;
    payment_reliability_score: number;
    verified_badge_status: 'none' | 'applicant_premium' | 'verified_payer' | 'verified_freelancer';
    created_at: string;
    category_name: string;
  };
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const router = useRouter();
  const timeAgo = dayjs(job.created_at).fromNow();

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'full_time': return 'bg-blue-500';
      case 'part_time': return 'bg-green-500';
      case 'freelance': return 'bg-purple-500';
      case 'remote': return 'bg-red-500';
      case 'hybrid': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePress = () => {
    router.push({
      pathname: `/jobs/JobDetailScreen`,
      params: { jobId: job.id.toString() }, // accessible via useLocalSearchParams on the detail screen
    });
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200"
      onPress={handlePress}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-xl font-JakartaBold text-gray-800 flex-1">{job.title}</Text>
        <Badge text={job.job_type.replace(/_/g, ' ')} color={getJobTypeColor(job.job_type)} />
      </View>

      <View className="flex-row items-center mb-1">
        <FontAwesome5 name="building" size={16} color="#4B5563" />
        <Text className="text-gray-600 ml-1 font-JakartaSemiBold">{job.employer_name}</Text>
        {job.employer_rating !== null && (
          <View className="flex-row items-center ml-2">
            <Feather name="star" size={14} color="#FBBF24" />
            <Text className="text-yellow-600 text-sm ml-0.5">{job.employer_rating.toFixed(1)}</Text>
          </View>
        )}
        {job.verified_badge_status === 'verified_payer' && (
          <Badge text="Verified Payer" color="bg-indigo-500 ml-2" />
        )}
      </View>

      <View className="flex-row items-center mb-1">
        <Feather name="briefcase" size={16} color="#4B5563" />
        <Text className="text-gray-600 ml-1 text-sm">{job.category_name}</Text>
      </View>

      {job.location && (
        <View className="flex-row items-center mb-1">
          <Entypo name="location-pin" size={16} color="#4B5563" />
          <Text className="text-gray-600 ml-1 text-sm">{job.location}</Text>
        </View>
      )}

      {job.salary_range && (
        <View className="flex-row items-center mb-2">
          <MaterialIcons name="attach-money" size={16} color="#4B5563" />
          <Text className="text-gray-600 ml-1 text-sm">{job.salary_range}</Text>
        </View>
      )}

      <Text className="text-gray-500 text-xs text-right mt-2">Posted {timeAgo}</Text>
    </TouchableOpacity>
  );
};

export default JobCard;
