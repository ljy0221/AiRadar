package com.mcp.airadar.user.repository;

import com.mcp.airadar.user.entity.UserInterest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserInterestRepository extends JpaRepository<UserInterest, UUID> {

    List<UserInterest> findByUserIdOrderByWeightDesc(UUID userId);

    Optional<UserInterest> findByUserIdAndKeyword(UUID userId, String keyword);

    void deleteByUserIdAndKeyword(UUID userId, String keyword);

    boolean existsByUserIdAndKeyword(UUID userId, String keyword);
}
